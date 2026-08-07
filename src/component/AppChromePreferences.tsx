import { memo, useCallback } from "react";
import { Button, Dropdown, Label } from "@heroui/react";
import { Languages, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import type { Theme } from "@/hooks/useTheme";
import type { AppLanguage } from "@/lib/prefs/language";

type AppChromePreferencesProps = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

const LANG_ITEMS: { id: AppLanguage; labelKey: string }[] = [
  { id: "en", labelKey: "app.preferences.languageEnglish" },
  { id: "vi", labelKey: "app.preferences.languageVietnamese" },
];

export const AppChromePreferences = memo(function AppChromePreferences({
  theme,
  onThemeChange,
}: AppChromePreferencesProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguagePreference();

  const handleLangAction = useCallback(
    (key: string | number) => {
      const id = String(key) as AppLanguage;
      if (id === "en" || id === "vi") setLanguage(id);
    },
    [setLanguage],
  );

  const cycleTheme = useCallback(() => {
    onThemeChange(theme === "dark" ? "light" : "dark");
  }, [onThemeChange, theme]);

  const isDark = theme === "dark";

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      <Dropdown>
        <Button
          size="sm"
          variant="tertiary"
          isIconOnly
          className="min-h-10 min-w-10"
          aria-label={t("app.preferences.languageMenu")}
        >
          <Languages className="size-4" />
        </Button>
        <Dropdown.Popover className="rounded-(--radius-outline)">
          <Dropdown.Menu
            aria-label={t("app.preferences.languageMenu")}
            onAction={handleLangAction}
          >
            {LANG_ITEMS.map((item) => (
              <Dropdown.Item key={item.id} id={item.id}>
                <Label
                  className={
                    language === item.id ? "font-medium text-accent" : undefined
                  }
                >
                  {t(item.labelKey)}
                </Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <Button
        size="sm"
        variant="tertiary"
        isIconOnly
        className="min-h-10 min-w-10"
        aria-label={isDark ? t("app.preferences.useLightTheme") : t("app.preferences.useDarkTheme")}
        aria-pressed={isDark}
        onPress={cycleTheme}
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </div>
  );
});
