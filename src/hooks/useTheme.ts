import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ensureNativeAppMenu, syncNativeMenuDarkMode } from "../lib/tauri/nativeAppMenu";

const STORAGE_KEY = "clidb-theme";

export type Theme = "light" | "dark";

function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
}

/** Syncs OS window chrome (title bar / controls) with HeroUI; no-op if not running in Tauri. */
function syncNativeWindowChrome(theme: Theme) {
  void getCurrentWindow()
    .setTheme(theme)
    .catch(() => {
      /* e.g. Vite preview in a normal browser */
    });
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    syncNativeWindowChrome(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore quota / private mode */
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const toggleThemeRef = useRef(toggleTheme);
  toggleThemeRef.current = toggleTheme;

  useEffect(() => {
    void ensureNativeAppMenu(resolveInitialTheme() === "dark", () => {
      toggleThemeRef.current();
    });
  }, []);

  useEffect(() => {
    void syncNativeMenuDarkMode(theme === "dark");
  }, [theme]);

  return { theme, setTheme, toggleTheme };
}
