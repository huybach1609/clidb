import "./App.css";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { AboutModal } from "@/component/AboutModal";
import { AppChromePreferences } from "@/component/AppChromePreferences";
import { CommandFormModal } from "@/component/CommandFormModal";
import { CommandList, type CommandAction } from "@/component/CommandList";
import { AppModal } from "@/component/AppModal";
import {
  CommandPageProvider,
  useCommandPageContext,
} from "@/app/CommandPageContext";
import { useCommandsCrud } from "@/app/useCommandsCrud";
import { useCommandExecutionStream } from "@/app/useCommandExecutionStream";
import { useNativeMenuBridge } from "@/hooks/useNativeMenuBridge";
import { useTheme } from "@/hooks/useTheme";
import type { CliCommand } from "@/lib/cli";

export function CommandPage() {
  const { t } = useTranslation();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const { state: crudState, actions: crudActions } = useCommandsCrud();
  const { state: streamState, actions: streamActions } = useCommandExecutionStream(
    crudActions.setError,
  );

  const busyCommandIds = useMemo(() => {
    const next = new Set<string>(streamState.executingIds);
    crudState.deletingIds.forEach((id) => next.add(id));
    return next;
  }, [crudState.deletingIds, streamState.executingIds]);

  const activeLogCommand = useMemo(
    () =>
      crudState.commands.find(
        (command) => command.id === streamState.activeLogCommandId,
      ) ?? null,
    [crudState.commands, streamState.activeLogCommandId],
  );
  const activeLogs = streamState.activeLogCommandId
    ? (streamState.logs[streamState.activeLogCommandId] ?? [])
    : [];
  const activeLogResult = streamState.activeLogCommandId
    ? streamState.commandResults[streamState.activeLogCommandId]
    : undefined;
  const activeStderrCount = activeLogs.reduce(
    (count, item) => (item.stream === "stderr" ? count + 1 : count),
    0,
  );
  const isActiveCommandRunning = streamState.activeLogCommandId
    ? streamState.executingIds.has(streamState.activeLogCommandId)
    : false;
  const activeStatusText = isActiveCommandRunning
    ? t("app.output.status.running")
    : activeLogResult?.success === false
      ? t("app.output.status.failed")
      : t("app.output.status.finished");

  const handleMenuAction = useCallback(
    async (actionKey: CommandAction, command: CliCommand) => {
      if (actionKey === "execute") {
        await streamActions.executeById(command.id);
        setOpenDropdownId(null);
        return;
      }

      if (actionKey === "edit") {
        crudActions.openEditModal(command);
        setOpenDropdownId(null);
        return;
      }

      if (actionKey === "delete") {
        await crudActions.deleteCommandById(command.id);
        setOpenDropdownId(null);
      }
    },
    [crudActions, streamActions],
  );

  const handleDropdownOpenChange = useCallback((id: string, isOpen: boolean) => {
    setOpenDropdownId(isOpen ? id : null);
  }, []);

  const contextValue = useMemo(
    () => ({
      state: {
        commands: crudState.commands,
        openDropdownId,
        busyCommandIds,
        runningCommandIds: streamState.executingIds,
        errorMessage: crudState.errorMessage,
        isFormModalOpen: crudState.isFormModalOpen,
        isSubmitting: crudState.isSubmitting,
        editingCommand: crudState.editingCommand,
        activeLogCommand,
        activeLogs,
        activeLogResult,
        activeStderrCount,
        isActiveCommandRunning,
      },
      actions: {
        onOpenDropdownChange: handleDropdownOpenChange,
        onMenuAction: handleMenuAction,
        openCreateModal: crudActions.openCreateModal,
        closeFormModal: crudActions.closeModal,
        saveCommand: crudActions.saveCommand,
        closeLogModal: streamActions.closeLogModal,
        clearError: crudActions.clearError,
      },
      meta: {
        activeStatusText,
      },
    }),
    [
      crudActions,
      crudState,
      openDropdownId,
      busyCommandIds,
      activeLogCommand,
      activeLogs,
      activeLogResult,
      activeStderrCount,
      isActiveCommandRunning,
      handleDropdownOpenChange,
      handleMenuAction,
      streamActions.closeLogModal,
      activeStatusText,
    ],
  );

  return (
    <CommandPageProvider value={contextValue}>
      <CommandPageBody />
    </CommandPageProvider>
  );
}

function CommandPageBody() {
  const { t } = useTranslation();
  const { state, actions, meta } = useCommandPageContext();
  const activeExitCode = state.activeLogResult?.exitCode;
  const { theme, setTheme, toggleTheme } = useTheme();
  const [aboutOpen, setAboutOpen] = useState(false);
  const closeAbout = useCallback(() => setAboutOpen(false), []);

  useNativeMenuBridge({
    theme,
    onOpenAbout: () => setAboutOpen(true),
    onToggleDarkMode: toggleTheme,
  });

  return (
    <main className="flex h-svh min-h-0 flex-col bg-background text-foreground">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-6 sm:px-6 lg:max-w-3xl lg:gap-4 lg:py-8">
        {state.errorMessage ? (
          <p className="shrink-0 text-danger" role="alert">
            {state.errorMessage}
          </p>
        ) : null}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            {t("app.title")}
          </h1>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-initial sm:gap-3">
            <AppChromePreferences theme={theme} onThemeChange={setTheme} />
            <Button size="sm" variant="tertiary" onClick={actions.openCreateModal}>
              <Plus className="size-4 shrink-0" />
              {t("app.actions.create")}
            </Button>
          </div>
        </header>
        {state.commands.length > 0 ? (
          <CommandList
            commands={state.commands}
            openDropdownId={state.openDropdownId}
            busyCommandIds={state.busyCommandIds}
            runningCommandIds={state.runningCommandIds}
            onOpenChange={actions.onOpenDropdownChange}
            onAction={actions.onMenuAction}
          />
        ) : (
          <p className="text-default-600">{t("app.emptyCommands")}</p>
        )}
      </div>
      <CommandFormModal
        isOpen={state.isFormModalOpen}
        isSubmitting={state.isSubmitting}
        initialCommand={state.editingCommand}
        onClose={actions.closeFormModal}
        onSave={actions.saveCommand}
      />
      <AboutModal isOpen={aboutOpen} onClose={closeAbout} />
      <AppModal.Root
        isOpen={state.activeLogCommand !== null}
        onClose={actions.closeLogModal}
        closeOnBackdropClick
      >
        <AppModal.Backdrop className="bg-black/50 backdrop-blur-[1px]" />
        <AppModal.Panel className="w-full max-w-2xl bg-background border border-default-200 shadow-medium">
          <AppModal.Title className="p-3">{t("app.output.title")}</AppModal.Title>
          <div className="mb-3 flex items-center justify-between gap-3 px-3 pt-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">
                {state.activeLogCommand?.name ?? t("app.output.title")}
              </p>
              <p className="text-xs text-default-500">{meta.activeStatusText}</p>
              <p className="text-xs text-default-500">
                {t("app.output.stderrLines", { count: state.activeStderrCount })}
                {!state.isActiveCommandRunning && activeExitCode != null
                  ? t("app.output.exitCode", { code: activeExitCode })
                  : ""}
              </p>
            </div>
          </div>
          <AppModal.Body>
            <div className="h-[320px] overflow-auto rounded-medium border border-default-200 bg-content2 p-3">
              {state.activeLogs.length > 0 ? (
                <pre className="font-mono text-xs whitespace-pre-wrap wrap-break-word">
                  {state.activeLogs.map((entry, index) => (
                    <span
                      key={`${entry.stream}-${index}`}
                      className={
                        entry.stream === "stderr"
                          ? "text-warning-600 dark:text-warning-400"
                          : "text-foreground"
                      }
                    >
                      {entry.text}
                      {"\n"}
                    </span>
                  ))}
                </pre>
              ) : (
                <pre className="font-mono text-xs whitespace-pre-wrap wrap-break-word text-foreground">
                  {t("app.output.waiting")}
                </pre>
              )}
            </div>
          </AppModal.Body>
          <AppModal.Footer className="px-3 pb-3">
            <Button size="sm" variant="tertiary" onClick={actions.closeLogModal}>
              {t("app.actions.close")}
            </Button>
          </AppModal.Footer>
        </AppModal.Panel>
      </AppModal.Root>
    </main>
  );
}
