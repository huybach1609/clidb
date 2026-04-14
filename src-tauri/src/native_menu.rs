//! Native menu bar: custom About (emits to webview) and Dark Mode toggle; no native About dialog.

use tauri::menu::{
    CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu, HELP_SUBMENU_ID,
    WINDOW_SUBMENU_ID,
};
use tauri::{App, AppHandle, Emitter, Manager, Wry};

pub const MENU_ID_ABOUT: &str = "open-about";
pub const MENU_ID_DARK_MODE: &str = "dark-mode";

pub struct DarkModeMenuState {
    pub item: CheckMenuItem<Wry>,
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn build_native_menu(
    app: &AppHandle<Wry>,
    dark_mode: &CheckMenuItem<Wry>,
) -> tauri::Result<Menu<Wry>> {
    let pkg_info = app.package_info();
    let window_menu = Submenu::with_id_and_items(
        app,
        WINDOW_SUBMENU_ID,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            #[cfg(target_os = "macos")]
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;

    let about_item = MenuItem::with_id(
        app,
        MENU_ID_ABOUT,
        format!("About {}", pkg_info.name),
        true,
        None::<&str>,
    )?;

    let help_menu = Submenu::with_id_and_items(
        app,
        HELP_SUBMENU_ID,
        "Help",
        true,
        {
            #[cfg(target_os = "macos")]
            {
                &[] as &[&dyn tauri::menu::IsMenuItem<Wry>]
            }
            #[cfg(not(target_os = "macos"))]
            {
                &[&about_item as &dyn tauri::menu::IsMenuItem<Wry>]
            }
        },
    )?;

    #[cfg(target_os = "macos")]
    let app_menu = Submenu::with_items(
        app,
        pkg_info.name.clone(),
        true,
        &[
            &about_item,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;

    #[cfg(target_os = "macos")]
    let fullscreen_item = PredefinedMenuItem::fullscreen(app, None)?;
    #[cfg(target_os = "macos")]
    let separator_item = PredefinedMenuItem::separator(app)?;
    #[cfg(target_os = "macos")]
    let view_items: Vec<&dyn tauri::menu::IsMenuItem<Wry>> = vec![
        &fullscreen_item,
        &separator_item,
        dark_mode,
    ];
    #[cfg(target_os = "macos")]
    let view_menu = Submenu::with_items(app, "View", true, &view_items)?;

    #[cfg(not(target_os = "macos"))]
    let view_items: Vec<&dyn tauri::menu::IsMenuItem<Wry>> = vec![dark_mode];
    #[cfg(not(target_os = "macos"))]
    let view_menu = Submenu::with_items(app, "View", true, &view_items)?;

    let menu = Menu::with_items(
        app,
        &[
            #[cfg(target_os = "macos")]
            &app_menu,
            #[cfg(not(any(
                target_os = "linux",
                target_os = "dragonfly",
                target_os = "freebsd",
                target_os = "netbsd",
                target_os = "openbsd"
            )))]
            &Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &PredefinedMenuItem::close_window(app, None)?,
                    #[cfg(not(target_os = "macos"))]
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?,
            &view_menu,
            &window_menu,
            &help_menu,
        ],
    )?;

    Ok(menu)
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn setup_native_menu(app: &mut App<Wry>) -> tauri::Result<()> {
    let handle = app.handle().clone();
    let dark_mode = CheckMenuItem::with_id(
        &handle,
        MENU_ID_DARK_MODE,
        "Dark Mode",
        true,
        false,
        Some("CmdOrCtrl+Shift+D"),
    )?;
    app.manage(DarkModeMenuState {
        item: dark_mode.clone(),
    });
    let menu = build_native_menu(&handle, &dark_mode)?;
    handle.set_menu(menu)?;
    Ok(())
}

#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn setup_native_menu(_app: &mut App<Wry>) -> tauri::Result<()> {
    Ok(())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn handle_menu_event(app: &AppHandle<Wry>, event: tauri::menu::MenuEvent) {
    if event.id == MENU_ID_ABOUT {
        let _ = app.emit("open-about-modal", ());
    } else if event.id == MENU_ID_DARK_MODE {
        let _ = app.emit("menu-toggle-dark-mode", ());
    }
}

#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn handle_menu_event(_app: &AppHandle<Wry>, _event: tauri::menu::MenuEvent) {}

#[tauri::command]
pub fn sync_dark_mode_menu(app: AppHandle, checked: bool) -> Result<(), String> {
    let Some(state) = app.try_state::<DarkModeMenuState>() else {
        return Ok(());
    };
    state.item.set_checked(checked).map_err(|e: tauri::Error| e.to_string())
}
