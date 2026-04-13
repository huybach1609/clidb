import { CheckMenuItem, Menu, Submenu } from "@tauri-apps/api/menu";
import { getCurrentWindow } from "@tauri-apps/api/window";

const DARK_MODE_MENU_ID = "clidb-menu-dark-mode";

let darkModeMenuItem: CheckMenuItem | null = null;
let installStarted = false;

function isMacOs(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
}

/**
 * Installs a **View → Dark Mode** item on the native menu bar (Tauri 2 JS Menu API).
 * macOS: uses {@link Menu.setAsAppMenu}. Windows/Linux: {@link Menu.setAsWindowMenu}.
 *
 * Starts from {@link Menu.default} so standard entries stay when the platform provides them.
 */
export async function ensureNativeAppMenu(
  initialDark: boolean,
  onToggleDarkMode: () => void,
): Promise<void> {
  if (installStarted) {
    return;
  }
  installStarted = true;

  try {
    const darkMode = await CheckMenuItem.new({
      id: DARK_MODE_MENU_ID,
      text: "Dark Mode",
      checked: initialDark,
      accelerator: "CmdOrCtrl+Shift+D",
      action: onToggleDarkMode,
    });
    darkModeMenuItem = darkMode;

    const viewMenu = await Submenu.new({
      id: "clidb-menu-view",
      text: "View",
      items: [darkMode],
    });

    let menu: Menu;
    try {
      menu = await Menu.default();
      await menu.append(viewMenu);
    } catch {
      menu = await Menu.new({ items: [viewMenu] });
    }

    if (isMacOs()) {
      await menu.setAsAppMenu();
    } else {
      await menu.setAsWindowMenu(await getCurrentWindow());
    }
  } catch {
    installStarted = false;
    darkModeMenuItem = null;
  }
}

/** Keeps the checkmark in sync when theme changes from the in-app Switch or shortcuts. */
export async function syncNativeMenuDarkMode(isDark: boolean): Promise<void> {
  if (!darkModeMenuItem) {
    return;
  }
  try {
    await darkModeMenuItem.setChecked(isDark);
  } catch {
    /* menu may be disposed */
  }
}
