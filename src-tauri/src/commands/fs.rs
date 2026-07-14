//! Plain-disk file I/O. The document is always UTF-8 markdown text; these
//! commands are the only path through which bytes reach the user's disk, and
//! `save_file` is atomic so a crash mid-write can never truncate the original.

use std::io::Write;
use std::path::Path;

use serde::Serialize;
use tauri::State;

use crate::watcher::WatcherState;

/// Read a file as UTF-8. Non-UTF-8 files are rejected with a clear message
/// rather than being lossily decoded — we never want to round-trip garbage.
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let bytes = std::fs::read(&path)
            .map_err(|e| format!("Could not read \u{201c}{path}\u{201d}: {e}"))?;
        String::from_utf8(bytes)
            .map_err(|_| format!("\u{201c}{path}\u{201d} is not valid UTF-8 text."))
    })
    .await
    .map_err(|e| format!("Read task failed: {e}"))?
}

/// Atomically overwrite `path` with `contents`.
///
/// Write to a temp file in the *same* directory (so `persist` is a rename, not
/// a cross-device copy), fsync it, then rename over the target. The original is
/// only replaced once the new bytes are fully durable. The resulting mtime is
/// recorded in the watcher's just-saved map so our own write does not bounce
/// back as an external `file-changed` event.
#[tauri::command]
pub async fn save_file(
    path: String,
    contents: String,
    watcher: State<'_, WatcherState>,
) -> Result<(), String> {
    let just_saved = watcher.just_saved.clone();
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let target = Path::new(&path);
        let dir = target
            .parent()
            .ok_or_else(|| format!("\u{201c}{path}\u{201d} has no parent directory."))?;

        // Preserve the original file's permissions across the rename; a fresh
        // temp file is created 0600 and would otherwise clobber them.
        let original_perms = std::fs::metadata(target).ok().map(|m| m.permissions());

        let mut tmp = tempfile::NamedTempFile::new_in(dir)
            .map_err(|e| format!("Could not create temp file: {e}"))?;
        tmp.write_all(contents.as_bytes())
            .map_err(|e| format!("Could not write temp file: {e}"))?;
        tmp.as_file()
            .sync_all()
            .map_err(|e| format!("Could not flush to disk: {e}"))?;
        tmp.persist(target)
            .map_err(|e| format!("Could not save \u{201c}{path}\u{201d}: {}", e.error))?;

        if let Some(perms) = original_perms {
            let _ = std::fs::set_permissions(target, perms);
        }

        // Key by the canonical path: the watcher canonicalizes event paths, so
        // a raw path (e.g. through the /tmp symlink on macOS) would never match
        // and every save would bounce back as a spurious external change.
        let canonical = std::fs::canonicalize(target).unwrap_or_else(|_| target.to_path_buf());
        if let Ok(mtime) = std::fs::metadata(&canonical).and_then(|m| m.modified()) {
            just_saved.lock().unwrap().insert(canonical, mtime);
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("Save task failed: {e}"))?
}

#[derive(Serialize)]
pub struct FileMeta {
    /// Last-modified time in milliseconds since the Unix epoch.
    pub mtime_ms: u64,
    pub size: u64,
}

/// Lightweight stat used to decide whether an on-disk file differs from what
/// the editor last loaded.
#[tauri::command]
pub async fn file_metadata(path: String) -> Result<FileMeta, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let meta = std::fs::metadata(&path)
            .map_err(|e| format!("Could not stat \u{201c}{path}\u{201d}: {e}"))?;
        let mtime_ms = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        Ok(FileMeta {
            mtime_ms,
            size: meta.len(),
        })
    })
    .await
    .map_err(|e| format!("Stat task failed: {e}"))?
}
