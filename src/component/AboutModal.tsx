import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import appIcon from "@/assets/app-icon.png";
import { AppModal } from "@/component/AppModal";
import { APP_VERSION, GITHUB_REPO_URL } from "@/lib/appMeta";

type AboutModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const { t } = useTranslation();

  const openGithub = () => {
    void openUrl(GITHUB_REPO_URL).catch(() => {
      window.open(GITHUB_REPO_URL, "_blank", "noopener,noreferrer");
    });
  };

  return (
    <AppModal.Root isOpen={isOpen} onClose={onClose} closeOnBackdropClick>
      <AppModal.Backdrop className="bg-black/50 backdrop-blur-[1px]" />
      <AppModal.Panel className="w-full max-w-sm bg-background border border-default-200 shadow-medium">
        <AppModal.Title className="p-3">{t("app.about.title")}</AppModal.Title>
        <AppModal.Body className="p-4 pb-2">
          <div className="flex flex-col items-center gap-4 text-center">
            <img
              alt={t("app.about.altLogo")}
              className="size-20 shrink-0 rounded-2xl shadow-small ring-1 ring-black/10 dark:ring-white/10"
              decoding="async"
              height={128}
              src={appIcon}
              width={128}
            />
            <div className="space-y-1">
              <p className="text-lg font-semibold tracking-tight">
                {t("app.about.productName")}
              </p>
              <p className="text-sm text-default-500">
                {t("app.about.versionLabel", { version: APP_VERSION })}
              </p>
            </div>
            <p className="text-sm text-default-600">{t("app.about.blurb")}</p>
          </div>
        </AppModal.Body>
        <AppModal.Footer className="border-t-0 px-4 pb-4">
          <Button size="sm" variant="outline" onClick={onClose}>
            {t("app.actions.close")}
          </Button>
          <Button size="sm" variant="default" onClick={openGithub}>
            {t("app.about.github")}
          </Button>
        </AppModal.Footer>
      </AppModal.Panel>
    </AppModal.Root>
  );
}
