/** Versioned key — extend migration in one place if schema changes (Vercel: client-localstorage-schema). */
export const LANG_STORAGE_KEY = "clidb-lang:v1" as const;

export const SUPPORTED_LANGUAGES = ["en", "vi"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function normalizeLanguage(code: string): AppLanguage {
  const base = code.split("-")[0]?.toLowerCase() ?? "en";
  return base === "vi" ? "vi" : "en";
}

export function readStoredLanguage(): AppLanguage | null {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    if (raw === "en" || raw === "vi") return raw;
  } catch {
    /* private mode / quota */
  }
  return null;
}

export function persistLanguage(lang: AppLanguage): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function applyDocumentLanguage(lang: AppLanguage): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
}
