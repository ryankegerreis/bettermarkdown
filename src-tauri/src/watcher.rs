//! Filesystem watcher. Watches the *parent directory* of each open file
//! (NonRecursive) rather than the file itself, because atomic saves — ours and
//! most other editors' — replace the file via rename, which would silently
//! break an inode-level watch. Events are filtered down to the exact files we
//! track and debounced, then surfaced to the frontend as `file-changed`.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, RecommendedCache};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

/// Paths we just wrote ourselves, mapped to the mtime we produced. Shared with
/// `save_file` so a self-inflicted event can be recognised and swallowed.
pub type JustSaved = Arc<Mutex<HashMap<PathBuf, SystemTime>>>;

pub struct WatcherState {
    pub just_saved: JustSaved,
    inner: Mutex<WatcherInner>,
}

struct WatcherInner {
    debouncer: Debouncer<RecommendedWatcher, RecommendedCache>,
    /// Canonical paths of files the frontend has asked us to watch.
    files: HashSet<PathBuf>,
    /// Refcount of directories under watch, keyed by canonical dir path.
    dirs: HashMap<PathBuf, usize>,
}

#[derive(Clone, Serialize)]
struct FileChanged {
    path: String,
}

/// Resolve symlinks so watch paths and event paths compare equal. Falls back to
/// the input if the file no longer exists (e.g. a removal event).
fn canon(p: &Path) -> PathBuf {
    std::fs::canonicalize(p).unwrap_or_else(|_| p.to_path_buf())
}

/// Build the (unmanaged) watcher state. The debouncer's callback runs on its
/// own thread and reaches back into the managed `WatcherState` via `app`.
pub fn build(app: AppHandle) -> notify::Result<WatcherState> {
    let just_saved: JustSaved = Arc::new(Mutex::new(HashMap::new()));
    let js_cb = just_saved.clone();
    let debouncer = new_debouncer(
        Duration::from_millis(500),
        None,
        move |result: DebounceEventResult| {
            handle_events(&app, &js_cb, result);
        },
    )?;
    Ok(WatcherState {
        just_saved,
        inner: Mutex::new(WatcherInner {
            debouncer,
            files: HashSet::new(),
            dirs: HashMap::new(),
        }),
    })
}

fn handle_events(app: &AppHandle, just_saved: &JustSaved, result: DebounceEventResult) {
    let events = match result {
        Ok(events) => events,
        Err(_) => return,
    };

    let mut seen: HashSet<PathBuf> = HashSet::new();
    for ev in &events {
        for p in &ev.event.paths {
            seen.insert(canon(p));
        }
    }
    if seen.is_empty() {
        return;
    }

    let state = app.state::<WatcherState>();
    for path in seen {
        let tracked = state.inner.lock().unwrap().files.contains(&path);
        if !tracked {
            continue;
        }

        let current = std::fs::metadata(&path).ok().and_then(|m| m.modified().ok());
        {
            let mut js = just_saved.lock().unwrap();
            if let Some(saved) = js.get(&path).copied() {
                if Some(saved) == current {
                    // Our own save — consume the token and stay quiet.
                    js.remove(&path);
                    continue;
                }
            }
        }

        let _ = app.emit(
            "file-changed",
            FileChanged {
                path: path.to_string_lossy().into_owned(),
            },
        );
    }
}

#[tauri::command]
pub fn watch_file(path: String, state: State<'_, WatcherState>) -> Result<(), String> {
    let file = canon(Path::new(&path));
    let dir = file
        .parent()
        .ok_or_else(|| format!("\u{201c}{path}\u{201d} has no parent directory."))?
        .to_path_buf();

    let mut inner = state.inner.lock().unwrap();
    if inner.files.contains(&file) {
        return Ok(());
    }

    let need_watch = *inner.dirs.get(&dir).unwrap_or(&0) == 0;
    if need_watch {
        inner
            .debouncer
            .watch(&dir, RecursiveMode::NonRecursive)
            .map_err(|e| format!("Could not watch \u{201c}{path}\u{201d}: {e}"))?;
    }
    *inner.dirs.entry(dir).or_insert(0) += 1;
    inner.files.insert(file);
    Ok(())
}

#[tauri::command]
pub fn unwatch_file(path: String, state: State<'_, WatcherState>) -> Result<(), String> {
    let file = canon(Path::new(&path));
    let dir = match file.parent() {
        Some(d) => d.to_path_buf(),
        None => return Ok(()),
    };

    let mut inner = state.inner.lock().unwrap();
    if !inner.files.remove(&file) {
        return Ok(());
    }

    let now_zero = if let Some(count) = inner.dirs.get_mut(&dir) {
        *count = count.saturating_sub(1);
        *count == 0
    } else {
        false
    };
    if now_zero {
        let _ = inner.debouncer.unwatch(&dir);
        inner.dirs.remove(&dir);
    }
    Ok(())
}
