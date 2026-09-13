import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PencilRuler, Play, ShieldAlert, Trash2, Terminal } from "lucide-react";
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
    async (action: CommandAction) => {
      await onAction(action, command);
    },
    [command, onAction],
  );

  const runDesktopAction = useCallback(
    (action: CommandAction) => {
      void onAction(action, command);
    },
    [command, onAction],
  );

  const hasEnvs = Object.keys(command.envs ?? {}).length > 0;

  const cardBorderClass = isRunning
    ? "border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-950/20"
    : "border-border/80 bg-card hover:border-primary/40 hover:shadow-xs";

  const commandBody = (
    <div className="min-w-0 flex-1 space-y-2 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm tracking-tight text-foreground wrap-break-word">
            {command.name}
          </span>
          {command.requires_root ? (
            <Badge variant="destructive" className="gap-1 px-1.5 py-0 text-[10px] uppercase">
              <ShieldAlert className="size-3" />
              Sudo
            </Badge>
          ) : null}
          {hasEnvs ? (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground border-border/80">
              Env
            </Badge>
          ) : null}
        </div>
        {isRunning ? (
          <Badge variant="default" className="bg-emerald-600 dark:bg-emerald-500 text-white gap-1.5 px-2 py-0.5 text-[10px] uppercase font-semibold animate-pulse">
            <span className="size-1.5 rounded-full bg-white animate-ping" />
            {t("app.output.status.running")}
          </Badge>
        ) : null}
      </div>

      {/* Styled Terminal Code Block */}
      <div className="group/code flex items-start gap-2 rounded-lg border border-border/50 bg-muted/60 dark:bg-zinc-950/60 px-3 py-2 font-mono text-xs text-foreground/90 transition-colors">
        <Terminal className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
        <span className="select-all break-all leading-relaxed flex-1">
          {command.command}
        </span>
      </div>

      {isRunning ? (
        <Progress
          aria-label={t("app.list.progressAriaLabel", { name: command.name })}
          className="h-1 mt-1 animate-pulse"
          value={null}
        />
      ) : null}
    </div>
  );

  return (
    <div className="p-0">
      <div
        className={`flex w-full min-h-20 items-stretch rounded-xl border p-3.5 sm:p-4 transition-all duration-200 ${cardBorderClass}`}
        style={{ opacity: isBusy ? 0.6 : 1 }}
      >
        {/* Narrow viewports: full-row opens action menu */}
        <div className="min-w-0 flex-1 lg:hidden">
          <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="h-auto w-full min-h-20 justify-start rounded-lg p-0 text-left outline-none cursor-pointer"
                  aria-label={t("app.list.openActionsFor", { name: command.name })}
                />
              }
            >
              <div className="flex h-full w-full flex-col text-left">
                {commandBody}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-36">
              <DropdownMenuItem
                disabled={isRunning}
                onClick={() => handleAction("execute")}
                className="text-emerald-600 dark:text-emerald-400 font-medium"
              >
                <Play className="size-4 shrink-0 mr-2 text-emerald-600 dark:text-emerald-400" />
                {isRunning ? t("app.actions.running") : t("app.actions.execute")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("edit")}>
                <PencilRuler className="size-4 shrink-0 mr-2 text-muted-foreground" />
                {t("app.actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAction("delete")}
                className="text-destructive focus:text-destructive font-medium"
              >
                <Trash2 className="size-4 shrink-0 mr-2 text-destructive" />
                {t("app.actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Wide desktop: text + icon actions on the right */}
        <div className="hidden min-w-0 flex-1 flex-col justify-center lg:flex">
          {commandBody}
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 border-l border-border/40 pl-3 ml-3 lg:flex">
          <Button
            size="icon"
            variant="ghost"
            disabled={isBusy || isRunning}
            aria-label={
              isRunning ? t("app.actions.running") : t("app.actions.execute")
            }
            onClick={() => runDesktopAction("execute")}
            className="size-9 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <Play className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={isBusy}
            aria-label={t("app.actions.edit")}
            onClick={() => runDesktopAction("edit")}
            className="size-9 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PencilRuler className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={isBusy}
            aria-label={t("app.actions.delete")}
            onClick={() => runDesktopAction("delete")}
            className="size-9 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
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
    <ScrollArea className="flex min-h-0 w-full flex-1 flex-col p-1 sm:p-2">
      <div className="flex flex-col gap-3">
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
      </div>
    </ScrollArea>
  );
});
