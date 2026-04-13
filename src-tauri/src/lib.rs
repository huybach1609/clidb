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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            cli_service::get_all_commands,
            cli_service::create_command,
            cli_service::update_command,
            cli_service::delete_command,
            cli_service::execute_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
