import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AppLanguage } from "@/lib/prefs/language";
import {
  applyDocumentLanguage,
  normalizeLanguage,
  persistLanguage,
} from "@/lib/prefs/language";

/**
 * Keeps i18n, <html lang>, and persisted locale in sync.
 * Interaction handlers update language — no effect-only sync loops.
 */
export function useLanguagePreference() {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    normalizeLanguage(i18n.language),
  );

  useEffect(() => {
    const onLang = (lng: string) => {
      setLanguageState(normalizeLanguage(lng));
    };
    i18n.on("languageChanged", onLang);
    return () => {
      void i18n.off("languageChanged", onLang);
    };
  }, [i18n]);

  const setLanguage = useCallback(
    (next: AppLanguage) => {
      void i18n.changeLanguage(next);
      persistLanguage(next);
      applyDocumentLanguage(next);
      setLanguageState(next);
    },
    [i18n],
  );

  return { language, setLanguage };
}
