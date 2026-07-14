mod commands;
mod watcher;

use tauri::{Emitter, Manager};

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
fn initial_file() -> Option<String> {
    file_from_args(std::env::args().collect::<Vec<_>>())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // single-instance must be registered first so a second launch is
        // intercepted before any window is created.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_focus();
            }
            if let Some(path) = file_from_args(argv) {
                let _ = app.emit("open-file", path);
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            app.manage(watcher::build(app.handle().clone())?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initial_file,
            commands::fs::read_file,
            commands::fs::save_file,
            commands::fs::file_metadata,
            watcher::watch_file,
            watcher::unwatch_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
