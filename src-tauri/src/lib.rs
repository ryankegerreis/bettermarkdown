mod commands;
mod watcher;

use std::sync::Mutex;

use tauri::{Emitter, Manager};

#[derive(Default)]
struct PendingOpen(Mutex<Option<String>>);

/// Pick the first real file path out of a process's argv, skipping the program
/// name and any `-flags`. Used for both "open with" launches and second-instance
/// hand-offs so double-clicking a file focuses the running window.
fn file_from_args<I: IntoIterator<Item = String>>(args: I) -> Option<String> {
    args.into_iter()
        .skip(1)
        .find(|a| !a.starts_with('-') && std::path::Path::new(a).is_file())
}

/// The file this process was launched with, if any. The frontend calls this
/// once on mount rather than relying on an event that could fire before its
/// listener is attached.
#[tauri::command]
fn initial_file(pending: tauri::State<'_, PendingOpen>) -> Option<String> {
    pending
        .0
        .lock()
        .ok()
        .and_then(|mut path| path.take())
        .or_else(|| file_from_args(std::env::args().collect::<Vec<_>>()))
}

fn announce_open_file(app: &tauri::AppHandle, path: String) {
    if let Ok(mut pending) = app.state::<PendingOpen>().0.lock() {
        *pending = Some(path.clone());
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
    }
    let _ = app.emit("open-file", path);
}

#[cfg(target_os = "macos")]
fn handle_run_event(app: &tauri::AppHandle, event: tauri::RunEvent) {
    if let tauri::RunEvent::Opened { urls } = event {
        if let Some(path) = urls
            .into_iter()
            .find_map(|url| url.to_file_path().ok())
            .filter(|path| path.is_file())
        {
            announce_open_file(app, path.to_string_lossy().into_owned());
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn handle_run_event(_app: &tauri::AppHandle, _event: tauri::RunEvent) {}

/// Open the platform print dialog for the current webview. The frontend mounts
/// a print-only document immediately before invoking this command.
#[tauri::command]
fn print_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window
        .print()
        .map_err(|error| format!("Could not open the print dialog: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(PendingOpen::default())
        // single-instance must be registered first so a second launch is
        // intercepted before any window is created.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = file_from_args(argv) {
                announce_open_file(app, path);
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            app.manage(watcher::build(app.handle().clone())?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initial_file,
            print_window,
            commands::fs::read_file,
            commands::fs::save_file,
            commands::fs::file_metadata,
            watcher::watch_file,
            watcher::unwatch_file,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(handle_run_event);
}
