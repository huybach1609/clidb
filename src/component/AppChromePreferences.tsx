import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    (key: string) => {
      const id = key as AppLanguage;
      if (id === "en" || id === "vi") setLanguage(id);
    },
    [setLanguage],
  );

  const cycleTheme = useCallback(() => {
    onThemeChange(theme === "dark" ? "light" : "dark");
  }, [onThemeChange, theme]);

  const isDark = theme === "dark";

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              className="size-8 text-muted-foreground hover:text-foreground"
              aria-label={t("app.preferences.languageMenu")}
            />
          }
        >
          <Languages className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LANG_ITEMS.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => handleLangAction(item.id)}
              className={
                language === item.id ? "font-medium text-primary" : undefined
              }
            >
              {t(item.labelKey)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="icon-sm"
        variant="ghost"
        className="size-8 text-muted-foreground hover:text-foreground"
        aria-label={isDark ? t("app.preferences.useLightTheme") : t("app.preferences.useDarkTheme")}
        aria-pressed={isDark}
        onClick={cycleTheme}
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </div>
  );
});
