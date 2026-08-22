import { memo, useCallback } from "react";
import { Button, Dropdown, Label, ProgressBar, ScrollShadow } from "@heroui/react";
import { PencilRuler, Play, Trash2 } from "lucide-react";
import type { CliCommand } from "@/lib/cli";
import { useTranslation } from "react-i18next";

export type CommandAction = "execute" | "edit" | "delete";

type CommandRowProps = {
  command: CliCommand;
  isOpen: boolean;
  isBusy: boolean;
  isRunning: boolean;
  onOpenChange: (id: string, isOpen: boolean) => void;
  onAction: (action: CommandAction, command: CliCommand) => Promise<void>;
};

const CommandRow = memo(function CommandRow({
  command,
  isOpen,
  isBusy,
  isRunning,
  onOpenChange,
  onAction,
}: CommandRowProps) {
  const { t } = useTranslation();
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => onOpenChange(command.id, nextOpen),
    [command.id, onOpenChange],
  );

  const handleAction = useCallback(
    async (key: string | number) => {
      await onAction(String(key) as CommandAction, command);
    },
    [command, onAction],
  );

  const runDesktopAction = useCallback(
    (action: CommandAction) => {
      void onAction(action, command);
    },
    [command, onAction],
  );

  const rowSurfaceClass = `rounded-(--radius) border bg-surface-secondary ${
    isRunning ? "border-accent/70 bg-accent/10" : "border-transparent"
  }`;

  const commandBody = (
    <div className="min-w-0 flex-1 space-y-1 text-left">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-sm leading-5 wrap-break-word">{command.name}</div>
        {isRunning ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
            {t("app.output.status.running")}
          </span>
        ) : null}
      </div>
      <div className="text-xs leading-4 opacity-70 break-all">{command.command}</div>
      {isRunning ? (
        <ProgressBar
          aria-label={t("app.list.progressAriaLabel", { name: command.name })}
          isIndeterminate
          size="sm"
          color="accent"
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      ) : null}
    </div>
  );

  return (
    <div className="p-0">
      <div
        className={`flex w-full min-h-20 items-stretch ${rowSurfaceClass}`}
        style={{ opacity: isBusy ? 0.5 : 1 }}
      >
        {/* Narrow viewports: full-row opens action menu */}
        <div className="min-w-0 flex-1 lg:hidden">
          <Dropdown isOpen={isOpen} onOpenChange={handleOpenChange}>
            <Dropdown.Trigger className="h-auto w-full min-h-20 justify-start rounded-(--radius) hover:bg-surface-tertiary">
              <div
                className="flex h-full w-full flex-col px-3 py-2.5 text-left"
                aria-label={t("app.list.openActionsFor", { name: command.name })}
              >
                {commandBody}
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover className="rounded-(--radius-outline)">
              <Dropdown.Menu onAction={handleAction}>
                <Dropdown.Item id="execute" key="execute" isDisabled={isRunning}>
                  <Play className="size-4 shrink-0 text-success" />
                  <Label className="text-success">
                    {isRunning ? t("app.actions.running") : t("app.actions.execute")}
                  </Label>
                </Dropdown.Item>
                <Dropdown.Item id="edit" key="edit">
                  <PencilRuler className="size-4 shrink-0 text-muted" />
                  <Label>{t("app.actions.edit")}</Label>
                </Dropdown.Item>
                <Dropdown.Item id="delete" key="delete">
                  <Trash2 className="size-4 shrink-0 text-danger" />
                  <Label className="text-danger">{t("app.actions.delete")}</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        {/* Wide desktop: text + icon actions on the right */}
        <div className="hidden min-w-0 flex-1 flex-col justify-center px-3 py-2.5 lg:flex">
          {commandBody}
        </div>
        <div className="hidden shrink-0 items-center gap-1 border-l border-default-200/60 py-2 pr-2 pl-1 lg:flex">
          <Button
            size="sm"
            variant="tertiary"
            isIconOnly
            isDisabled={isBusy || isRunning}
            aria-label={
              isRunning ? t("app.actions.running") : t("app.actions.execute")
            }
            onPress={() => runDesktopAction("execute")}
            className="min-h-10 min-w-10"
          >
            <Play className="size-4 text-success" />
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            isIconOnly
            isDisabled={isBusy}
            aria-label={t("app.actions.edit")}
            onPress={() => runDesktopAction("edit")}
            className="min-h-10 min-w-10"
          >
            <PencilRuler className="size-4 text-muted" />
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            isIconOnly
            isDisabled={isBusy}
            aria-label={t("app.actions.delete")}
            onPress={() => runDesktopAction("delete")}
            className="min-h-10 min-w-10"
          >
            <Trash2 className="size-4 text-danger" />
          </Button>
        </div>
      </div>
    </div>
  );
});

type CommandListProps = {
  commands: CliCommand[];
  openDropdownId: string | null;
  busyCommandIds: Set<string>;
  runningCommandIds: Set<string>;
  onOpenChange: (id: string, isOpen: boolean) => void;
  onAction: (action: CommandAction, command: CliCommand) => Promise<void>;
};

export const CommandList = memo(function CommandList({
  commands,
  openDropdownId,
  busyCommandIds,
  runningCommandIds,
  onOpenChange,
  onAction,
}: CommandListProps) {
  return (
    <ScrollShadow className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto rounded-(--radius-outline) rounded-medium border border-default-200 p-3 sm:p-4">
      {commands.map((command) => (
        <CommandRow
          key={command.id}
          command={command}
          isOpen={openDropdownId === command.id}
          isBusy={busyCommandIds.has(command.id)}
          isRunning={runningCommandIds.has(command.id)}
          onOpenChange={onOpenChange}
          onAction={onAction}
        />
      ))}
    </ScrollShadow>
  );
});
