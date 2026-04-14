import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  applyDocumentLanguage,
  normalizeLanguage,
  readStoredLanguage,
  type AppLanguage,
} from "@/lib/prefs/language";
import en from "./locales/en.json";
import vi from "./locales/vi.json";

function resolveInitialLng(): AppLanguage {
  const stored = readStoredLanguage();
  if (stored) {
    applyDocumentLanguage(stored);
    return stored;
  }
  const fromNav = normalizeLanguage(
    typeof navigator !== "undefined" ? navigator.language : "en",
  );
  applyDocumentLanguage(fromNav);
  return fromNav;
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    lng: resolveInitialLng(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  })
  .catch((err: unknown) => {
    console.error("i18n init failed", err);
  });

export default i18n;
