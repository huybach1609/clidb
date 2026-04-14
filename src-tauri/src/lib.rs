use tauri::Manager;
mod ipc_error {
    use serde::{Deserialize, Serialize};

    /// Serializable command error for IPC. The frontend maps `message_key` through i18n;
    /// `detail` is optional technical context (IO errors, etc.).
    #[derive(Debug, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct IpcError {
        pub message_key: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub detail: Option<String>,
    }

    impl IpcError {
        pub fn new(message_key: impl Into<String>, detail: Option<String>) -> Self {
            Self {
                message_key: message_key.into(),
                detail,
            }
        }
    }
}

mod cli_service;
mod native_menu;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd|{
        // when user try to open the app again, tauri use use_webview_window to get window
        if let Some(windown) = app.get_webview_window("main") {
            let _ = windown.show();
            let _ = windown.unminimize();
            let _ = windown.set_focus();
        }
    }))
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            native_menu::setup_native_menu(app)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            native_menu::handle_menu_event(app, event);
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            cli_service::get_all_commands,
            cli_service::create_command,
            cli_service::update_command,
            cli_service::delete_command,
            cli_service::execute_command,
            native_menu::sync_dark_mode_menu
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
