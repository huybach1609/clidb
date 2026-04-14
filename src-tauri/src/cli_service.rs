use crate::ipc_error::IpcError;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::process::Stdio;
use std::thread;
use std::{collections::HashMap, process::Command};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Emitter, Manager};

// định nghĩa cấu trúc dữ liệu mapping chính xác với object từ frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CliCommand {
    id: String,
    name: String,
    command: String,
    #[serde(default)]
    requires_root: bool,
    #[serde(default)] // Đảm bảo tương thích ngược, tự gán map rỗng nếu file JSON cũ chưa có
    envs: HashMap<String, String>,
}

#[derive(Clone, Serialize)]
pub struct CommandLog {
    pub id: String,
    pub text: String,
    pub stream: String,
}

#[derive(Clone, Serialize)]
pub struct CommandFinished {
    pub id: String,
    pub success: bool,
    pub exit_code: Option<i32>,
}

// Danh sách các biến môi trường hệ thống không cho phép ghi đè từ user-defined envs
const RESTRICTED_ENVS: &[&str] = &["PATH", "HOME", "USER", "PWD", "SHELL"];

fn validate_envs(envs: &HashMap<String, String>) -> Result<(), IpcError> {
    for key in envs.keys() {
        if RESTRICTED_ENVS.contains(&key.as_str()) {
            return Err(IpcError::new(
                "errors.saveCli.restrictedEnv",
                Some(format!("Cannot override protected system variable: {key}")),
            ));
        }
    }
    Ok(())
}

fn get_file_path(app_handle: &AppHandle) -> Result<PathBuf, IpcError> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| IpcError::new("errors.saveCli.appDataDir", Some(e.to_string())))?
        .join("clidb");

    fs::create_dir_all(&dir)
        .map_err(|e| IpcError::new("errors.saveCli.createDir", Some(e.to_string())))?;
    Ok(dir.join("data.json"))
}
fn read_db(app_handle: &AppHandle) -> Result<Vec<CliCommand>, IpcError> {
    let path = get_file_path(app_handle)?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| IpcError::new("errors.saveCli.readFile", Some(e.to_string())))?;
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }

    match serde_json::from_str(&content) {
        Ok(v) => Ok(v),
        Err(e) => {
            // If the DB is corrupted, back it up and reset to an empty DB
            // so the app can recover instead of failing to boot.
            let backup_path = path.with_extension("corrupt.json");
            let _ = fs::rename(&path, &backup_path);
            let _ = fs::write(&path, "[]");
            Err(IpcError::new(
                "errors.saveCli.deserialize",
                Some(format!("{e}; backed up to {}", backup_path.display())),
            ))
        }
    }
}
fn write_db(app_handle: &AppHandle, data: Vec<CliCommand>) -> Result<(), IpcError> {
    let path = get_file_path(app_handle)?;
    let json_string = serde_json::to_string_pretty(&data)
        .map_err(|e| IpcError::new("errors.saveCli.serialize", Some(e.to_string())))?;
    fs::write(&path, json_string)
        .map_err(|e| IpcError::new("errors.saveCli.writeFile", Some(e.to_string())))?;
    Ok(())
}
fn get_command_by_id(app_handle: &AppHandle, id: String) -> Result<CliCommand, IpcError> {
    let db = read_db(app_handle)?;
    let command = db
        .iter()
        .find(|c| c.id == id)
        .cloned()
        .ok_or(IpcError::new("errors.saveCli.commandNotFound", None))?;
    Ok(command)
}
// READ: Lấy toàn bộ dữ liệu
#[tauri::command]
pub fn get_all_commands(app_handle: AppHandle) -> Result<Vec<CliCommand>, IpcError> {
    read_db(&app_handle)
}

// CREATE: Thêm mới dữ liệu
#[tauri::command]
pub fn create_command(app_handle: AppHandle, data: CliCommand) -> Result<(), IpcError> {
    validate_envs(&data.envs)?;
    let mut db = read_db(&app_handle)?;
    db.push(data);
    write_db(&app_handle, db)
}

// UPDATE: Cập nhật dữ liệu
#[tauri::command]
pub fn update_command(app_handle: AppHandle, data: CliCommand) -> Result<(), IpcError> {
    validate_envs(&data.envs)?;
    let mut db = read_db(&app_handle)?;
    let index = db
        .iter()
        .position(|c| c.id == data.id)
        .ok_or(IpcError::new("errors.saveCli.commandNotFound", None))?;
    db[index] = data;
    write_db(&app_handle, db)
}

// DELETE: Xóa dữ liệu
#[tauri::command]
pub fn delete_command(app_handle: AppHandle, id: String) -> Result<(), IpcError> {
    let mut db = read_db(&app_handle)?;
    db.retain(|c| c.id != id);
    write_db(&app_handle, db)
}

// #[tauri::command]
// pub fn execute_command(app_handle: AppHandle, id: String) -> Result<String, IpcError> {
//     // 1. Lấy command by id
//     let command = get_command_by_id(&app_handle, id)?;

//     // Tự động loại bỏ chữ "sudo " ở đầu nếu người dùng lỡ nhập sai trên UI
//     let mut cmd_str = command.command.trim().to_string();
//     if cmd_str.starts_with("sudo ") {
//         cmd_str = cmd_str.strip_prefix("sudo ").unwrap_or(&cmd_str).to_string();
//     }

//     // 2. Phân nhánh thực thi dựa trên OS và yêu cầu quyền root
//     let output = if cfg!(target_os = "windows") {
//         if command.requires_root {
//             Command::new("powershell")
//                 .args(["-Command", "Start-Process", "cmd", "-ArgumentList", &format!("'/c {}'", cmd_str), "-Verb", "RunAs", "-Wait"])
//                 .envs(&command.envs)
//                 .output()
//         } else {
//             let mut process = Command::new("cmd");
//             process.args(["/C", &cmd_str]);
//             process.envs(&command.envs);
//             process.output()
//         }
//     } else if cfg!(target_os = "macos") {
//         if command.requires_root {
//             let apple_script = format!("do shell script \"{}\" with administrator privileges", cmd_str);
//             let mut process = Command::new("osascript");
//             process.args(["-e", &apple_script]);
//             process.envs(&command.envs);
//             process.output()
//         } else {
//             let mut process = Command::new("sh");
//             process.args(["-c", &cmd_str]);
//             process.envs(&command.envs);
//             process.output()
//         }
//     } else {
//         // Cho Linux (Debian, CachyOS, KDE Neon, v.v.)
//         if command.requires_root {
//             // pkexec có thể dọn env hiện tại; truyền env qua "env VAR=... sh -c ..."
//             let mut pkexec_args = vec!["env".to_string()];
//             for (k, v) in &command.envs {
//                 pkexec_args.push(format!("{k}={v}"));
//             }
//             pkexec_args.push("sh".to_string());
//             pkexec_args.push("-c".to_string());
//             pkexec_args.push(cmd_str);

//             Command::new("pkexec")
//                 .args(pkexec_args)
//                 .output()
//         } else {
//             let mut process = Command::new("sh");
//             process.args(["-c", &cmd_str]);
//             process.envs(&command.envs);
//             process.output()
//         }
//     };

//     // 3. Xử lý kết quả trả về
//     match output {
//         Ok(output) => {
//             if output.status.success() {
//                 Ok(String::from_utf8_lossy(&output.stdout).to_string())
//             } else {
//                 Err(IpcError::new("errors.saveCli.executeCommand", Some(String::from_utf8_lossy(&output.stderr).to_string())))
//             }
//         }
//         Err(e) => {
//             Err(IpcError::new("errors.saveCli.executeCommand", Some(e.to_string())))
//         }
//     }
// }
#[tauri::command]
pub fn execute_command(app_handle: AppHandle, id: String) -> Result<(), IpcError> {
    // 1. Lấy command by id và làm sạch chuỗi
    let command = get_command_by_id(&app_handle, id.clone())?;

    let mut cmd_str = command.command.trim().to_string();
    if cmd_str.starts_with("sudo ") {
        cmd_str = cmd_str
            .strip_prefix("sudo ")
            .unwrap_or(&cmd_str)
            .to_string();
    }

    // 2. Thiết lập builder cho Command thay vì chạy ngay
    let mut process = if cfg!(target_os = "windows") {
        if command.requires_root {
            let mut p = Command::new("powershell");
            p.args([
                "-Command",
                "Start-Process",
                "cmd",
                "-ArgumentList",
                &format!("'/c {}'", cmd_str),
                "-Verb",
                "RunAs",
                "-Wait",
            ]);
            p.envs(&command.envs);
            p
        } else {
            let mut p = Command::new("cmd");
            p.args(["/C", &cmd_str]);
            p.envs(&command.envs);
            p
        }
    } else if cfg!(target_os = "macos") {
        if command.requires_root {
            let apple_script = format!(
                "do shell script \"{}\" with administrator privileges",
                cmd_str
            );
            let mut p = Command::new("osascript");
            p.args(["-e", &apple_script]);
            p.envs(&command.envs);
            p
        } else {
            let mut p = Command::new("sh");
            p.args(["-c", &cmd_str]);
            p.envs(&command.envs);
            p
        }
    } else {
        // Cho Linux
        if command.requires_root {
            let mut pkexec_args = vec!["env".to_string()];
            for (k, v) in &command.envs {
                pkexec_args.push(format!("{k}={v}"));
            }
            pkexec_args.push("sh".to_string());
            pkexec_args.push("-c".to_string());
            pkexec_args.push(cmd_str);

            let mut p = Command::new("pkexec");
            p.args(pkexec_args);
            p
        } else {
            let mut p = Command::new("sh");
            p.args(["-c", &cmd_str]);
            p.envs(&command.envs);
            p
        }
    };

    // 3. Chuyển hướng luồng đầu ra chuẩn (stdout) và lỗi (stderr) vào pipe
    process.stdout(Stdio::piped());
    process.stderr(Stdio::piped());

    // 4. Khởi chạy tiến trình (không block)
    let mut child = process
        .spawn()
        .map_err(|e| IpcError::new("errors.saveCli.executeCommand", Some(e.to_string())))?;

    // Lấy các đường ống dữ liệu ra khỏi tiến trình con
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let app_clone = app_handle.clone();
    let id_clone = id.clone();

    // 5. Đẩy việc đọc dữ liệu vào một Thread riêng để không làm treo Tauri
    thread::spawn(move || {
        // Sử dụng scoped thread hoặc các thread phụ để tránh tình trạng deadlock
        // khi stdout và stderr bị đầy bộ đệm (pipe buffer).

        // Đọc Stdout
        let app_out = app_clone.clone();
        let id_out = id_clone.clone();
        let out_thread = thread::spawn(move || {
            if let Some(out) = stdout {
                let reader = BufReader::new(out);
                for line in reader.lines().flatten() {
                    let _ = app_out.emit(
                        "command-log",
                        CommandLog {
                            id: id_out.clone(),
                            text: line,
                            stream: "stdout".to_string(),
                        },
                    );
                }
            }
        });

        // Đọc Stderr
        let app_err = app_clone.clone();
        let id_err = id_clone.clone();
        let err_thread = thread::spawn(move || {
            if let Some(err) = stderr {
                let reader = BufReader::new(err);
                for line in reader.lines().flatten() {
                    let _ = app_err.emit(
                        "command-log",
                        CommandLog {
                            id: id_err.clone(),
                            text: line,
                            stream: "stderr".to_string(),
                        },
                    );
                }
            }
        });

        // Chờ 2 luồng đọc dữ liệu kết thúc
        let _ = out_thread.join();
        let _ = err_thread.join();

        // Chờ tiến trình gốc kết thúc để dọn dẹp bộ nhớ
        let finished_payload = match child.wait() {
            Ok(status) => CommandFinished {
                id: id_clone,
                success: status.success(),
                exit_code: status.code(),
            },
            Err(_) => CommandFinished {
                id: id_clone,
                success: false,
                exit_code: None,
            },
        };

        // Báo hiệu cho React biết lệnh đã chạy xong
        let _ = app_clone.emit("command-finished", finished_payload);
    });

    Ok(())
}
