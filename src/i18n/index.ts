import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import vi from "./locales/vi.json";

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    lng: navigator.language.split("-")[0] ?? "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  })
  .catch((err: unknown) => {
    console.error("i18n init failed", err);
  });

export default i18n;
