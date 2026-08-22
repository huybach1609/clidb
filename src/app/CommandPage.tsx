import "./App.css";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Plus, Terminal, XCircle } from "lucide-react";
import appIcon from "@/assets/app-icon.png";
import { AboutModal } from "@/component/AboutModal";
import { AppChromePreferences } from "@/component/AppChromePreferences";
import { CommandFormModal } from "@/component/CommandFormModal";
import { CommandList, type CommandAction } from "@/component/CommandList";
import { AppModal } from "@/component/AppModal";
import { WindowControls } from "@/component/WindowControls";
import {
  CommandPageProvider,
  useCommandPageContext,
} from "@/app/CommandPageContext";
import { useCommandsCrud } from "@/app/useCommandsCrud";
import { useCommandExecutionStream } from "@/app/useCommandExecutionStream";
import { useNativeMenuBridge } from "@/hooks/useNativeMenuBridge";
import { useTheme } from "@/hooks/useTheme";
import type { CliCommand } from "@/lib/cli";

import { getCurrentWindow } from "@tauri-apps/api/window";

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
  const { state, actions } = useCommandPageContext();
  const activeExitCode = state.activeLogResult?.exitCode;
  const { theme, setTheme, toggleTheme } = useTheme();
  const [aboutOpen, setAboutOpen] = useState(false);
  const closeAbout = useCallback(() => setAboutOpen(false), []);

  useNativeMenuBridge({
    theme,
    onOpenAbout: () => setAboutOpen(true),
    onToggleDarkMode: toggleTheme,
  });

  const handleStartDrag = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      try {
        void getCurrentWindow().startDragging();
      } catch {
        /* not in tauri */
      }
    }
  }, []);

  return (
    <main className="flex h-svh min-h-0 flex-col bg-background text-foreground select-none">
      {/* Sleek Frameless Titlebar Header */}
      <header className="flex shrink-0 h-10 items-center justify-between px-3 border-b border-border/50 bg-card/70 backdrop-blur-md select-none">
        {/* Left Drag Region: Logo, Title, Badge */}
        <div
          data-tauri-drag-region
          onMouseDown={handleStartDrag}
          className="flex items-center gap-2 min-w-0 cursor-default select-none py-1 pr-2"
        >
          <img
            src={appIcon}
            alt="clidb logo"
            className="size-4.5 rounded-sm shrink-0 pointer-events-none"
          />
          <span className="font-bold text-xs tracking-tight text-foreground pointer-events-none">
            {t("app.title")}
          </span>
          <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 rounded-full border border-border/50 text-muted-foreground pointer-events-none">
            {state.commands.length}
          </Badge>
        </div>

        {/* Middle Flexible Drag Area */}
        <div
          data-tauri-drag-region
          onMouseDown={handleStartDrag}
          className="flex-1 h-full cursor-default"
        />

        {/* Right Non-Drag Interactive Area: Preferences, Create Button, Window Controls */}
        <div className="flex items-center gap-1.5 shrink-0 z-10">
          <div className="">
            <AppChromePreferences theme={theme} onThemeChange={setTheme} />
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={actions.openCreateModal}
            className="gap-1 shadow-xs font-medium px-2.5 h-7 text-xs rounded-md"
          >
            <Plus className="size-3.5 shrink-0" />
            {t("app.actions.create")}
          </Button>
          <WindowControls />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-4 sm:px-6 lg:max-w-3xl lg:gap-4 lg:py-6">
        {state.errorMessage ? (
          <p className="shrink-0 text-destructive text-sm font-medium" role="alert">
            {state.errorMessage}
          </p>
        ) : null}
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
        <AppModal.Backdrop />
        <AppModal.Panel className="w-full max-w-2xl">
          <AppModal.Header onClose={actions.closeLogModal}>
            <div className="flex items-center justify-between gap-3 pr-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Terminal className="size-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-base tracking-tight truncate text-foreground">
                    {state.activeLogCommand?.name ?? t("app.output.title")}
                  </h3>
                  <p className="font-mono text-[11px] text-muted-foreground/80 truncate">
                    {state.activeLogCommand?.command}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {state.isActiveCommandRunning ? (
                  <Badge variant="default" className="bg-blue-600 dark:bg-blue-500 text-white gap-1.5 px-2 py-0.5 text-xs font-semibold animate-pulse">
                    <Loader2 className="size-3 animate-spin" />
                    {t("app.output.status.running")}
                  </Badge>
                ) : activeExitCode === 0 ? (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 px-2 py-0.5 text-xs font-semibold">
                    <CheckCircle2 className="size-3" />
                    {t("app.output.status.finished")}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 px-2 py-0.5 text-xs font-semibold">
                    <XCircle className="size-3" />
                    {t("app.output.status.failed")}
                  </Badge>
                )}
                {activeExitCode != null && !state.isActiveCommandRunning ? (
                  <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground">
                    exit: {activeExitCode}
                  </Badge>
                ) : null}
              </div>
            </div>
          </AppModal.Header>
          <AppModal.Body className="p-4 bg-zinc-950/90 dark:bg-zinc-950">
            <div className="h-[340px] overflow-auto rounded-xl border border-zinc-800/80 bg-zinc-950 p-4 font-mono text-xs shadow-inner">
              {state.activeLogs.length > 0 ? (
                <div className="space-y-1">
                  {state.activeLogs.map((entry, index) => (
                    <div
                      key={`${entry.stream}-${index}`}
                      className={`leading-relaxed break-all ${
                        entry.stream === "stderr"
                          ? "text-rose-400 font-medium"
                          : "text-zinc-200"
                      }`}
                    >
                      <span className="select-none text-zinc-600 mr-2">$</span>
                      {entry.text}
                    </div>
                  ))}
                </div>
              ) : state.isActiveCommandRunning ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
                  <Loader2 className="size-5 animate-spin text-zinc-400" />
                  <p className="text-xs font-sans">{t("app.output.waiting")}</p>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-zinc-500">
                  <p className="text-xs font-sans">{t("app.output.waiting")}</p>
                </div>
              )}
            </div>
          </AppModal.Body>
          <AppModal.Footer>
            <Button size="sm" variant="outline" onClick={actions.closeLogModal}>
              {t("app.actions.close")}
            </Button>
          </AppModal.Footer>
        </AppModal.Panel>
      </AppModal.Root>
    </main>
  );
}
