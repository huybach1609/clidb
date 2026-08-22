import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

type Theme = "light" | "dark";

/**
 * Listens for Rust menu events (`open-about-modal`, `menu-toggle-dark-mode`)
 * and keeps the native "Dark Mode" menu checkmark aligned with app theme.
 */
export function useNativeMenuBridge(options: {
  theme: Theme;
  onOpenAbout: () => void;
  onToggleDarkMode: () => void;
}) {
  const onOpenAboutRef = useRef(options.onOpenAbout);
  const onToggleDarkModeRef = useRef(options.onToggleDarkMode);
  onOpenAboutRef.current = options.onOpenAbout;
  onToggleDarkModeRef.current = options.onToggleDarkMode;

  useEffect(() => {
    let cancelled = false;
    let unlistenAbout: (() => void) | undefined;
    let unlistenToggle: (() => void) | undefined;

    void (async () => {
      try {
        unlistenAbout = await listen("open-about-modal", () => {
          onOpenAboutRef.current();
        });
        unlistenToggle = await listen("menu-toggle-dark-mode", () => {
          onToggleDarkModeRef.current();
        });
      } catch {
        /* not running in Tauri */
      }
      if (cancelled) {
        unlistenAbout?.();
        unlistenToggle?.();
      }
    })();

    return () => {
      cancelled = true;
      unlistenAbout?.();
      unlistenToggle?.();
    };
  }, []);

  useEffect(() => {
    void invoke("sync_dark_mode_menu", {
      checked: options.theme === "dark",
    }).catch(() => {
      /* browser / menu not installed */
    });
  }, [options.theme]);
}
