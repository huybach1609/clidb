import { memo, useCallback } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  PencilRuler,
  Play,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import type { CliCommand } from "@/lib/cli";
import { useTranslation } from "react-i18next";
import { MAX_COMMAND_SHORTCUTS } from "@/hooks/useCommandHotkeys";

export type CommandAction = "execute" | "edit" | "delete";

/**
 * Hiển thị lệnh dạng code: ngắt dòng theo khoảng trắng (giữ nguyên từng tham số),
 * chỉ ngắt giữa từ khi một token dài hơn cả dòng; cuộn dọc nếu lệnh quá dài.
 */
function CommandCode({
  command,
  bordered = true,
}: {
  command: string;
  bordered?: boolean;
}) {
  return (
    <code
      className={cn(
        "block max-h-44 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-foreground/90",
        bordered && "rounded-md border border-border/60 bg-muted/60 px-2.5 py-2",
        !bordered && "px-2.5 py-2 text-xs",
      )}
    >
      {command}
    </code>
  );
}

type CommandRowProps = {
  command: CliCommand;
  /** Số phím tắt (1..9) theo vị trí hiển thị, null nếu vượt giới hạn. */
  shortcutNumber: number | null;
  showShortcut: boolean;
  isOpen: boolean;
  isBusy: boolean;
  isRunning: boolean;
  onOpenChange: (id: string, isOpen: boolean) => void;
  onAction: (action: CommandAction, command: CliCommand) => Promise<void>;
};

const CommandRow = memo(function CommandRow({
  command,
  shortcutNumber,
  showShortcut,
  isOpen,
  isBusy,
  isRunning,
  onOpenChange,
  onAction,
}: CommandRowProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: command.id });

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

  // Lệnh chỉ hiện khi hover tên (desktop). Màn nhỏ không có hover nên hiện trong dropdown.
  const renderCommandBody = (withHoverHint: boolean) => {
    const titleNode = (
      <span className="font-semibold text-sm tracking-tight text-foreground wrap-break-word">
        {command.name}
      </span>
    );

    return (
      <div className="min-w-0 flex-1 space-y-1.5 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {withHoverHint ? (
              <Tooltip>
                <TooltipTrigger
                  delay={300}
                  render={<span className="min-w-0 cursor-default" />}
                >
                  {titleNode}
                </TooltipTrigger>
                {/* Mở xuống dưới: title nằm sát mép trên cửa sổ nên mở lên sẽ bị cắt */}
                <TooltipContent side="bottom" align="start" className="max-w-lg p-0">
                  <CommandCode command={command.command} bordered={false} />
                </TooltipContent>
              </Tooltip>
            ) : (
              titleNode
            )}
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
            {showShortcut && shortcutNumber !== null ? (
              <kbd className="ml-0.5 rounded border border-border/80 bg-muted px-1.5 py-0 font-mono text-[10px] text-muted-foreground">
                {shortcutNumber}
              </kbd>
            ) : null}
          </div>
          {isRunning ? (
            <Badge variant="default" className="bg-emerald-600 dark:bg-emerald-500 text-white gap-1.5 px-2 py-0.5 text-[10px] uppercase font-semibold animate-pulse">
              <span className="size-1.5 rounded-full bg-white animate-ping" />
              {t("app.output.status.running")}
            </Badge>
          ) : null}
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
  };

  return (
    <div
      ref={setNodeRef}
      className="p-0"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : isBusy ? 0.6 : 1,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
      aria-keyshortcuts={
        shortcutNumber !== null
          ? `Control+${shortcutNumber} Meta+${shortcutNumber}`
          : undefined
      }
    >
      <div
        className={`flex w-full items-center rounded-xl border px-3 py-2.5 transition-all duration-200 ${cardBorderClass}`}
      >
        {/* Drag handle: chỉ handle mới kéo được, để không xung đột với click mở menu */}
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={t("app.list.dragHandle", { name: command.name })}
          className="flex shrink-0 cursor-grab touch-none items-center pr-2 text-muted-foreground/50 outline-none hover:text-foreground focus-visible:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        {/* Narrow viewports: full-row opens action menu */}
        <div className="min-w-0 flex-1 lg:hidden">
          <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="h-auto w-full justify-start rounded-lg p-0 text-left outline-none cursor-pointer"
                  aria-label={t("app.list.openActionsFor", { name: command.name })}
                />
              }
            >
              <div className="flex h-full w-full flex-col text-left">
                {renderCommandBody(false)}
              </div>
            </DropdownMenuTrigger>
            {/* Base menu mặc định bằng chiều rộng trigger; ở đây cần rộng theo nội dung */}
            <DropdownMenuContent align="start" className="w-auto min-w-56 max-w-[min(26rem,calc(100vw-2rem))]">
              <div className="p-1">
                <CommandCode command={command.command} />
              </div>
              <DropdownMenuSeparator />
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

        {/* Wide desktop: title (hover shows command) + icon actions on the right */}
        <div className="hidden min-w-0 flex-1 flex-col justify-center lg:flex">
          {renderCommandBody(true)}
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
            className="size-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <Play className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={isBusy}
            aria-label={t("app.actions.edit")}
            onClick={() => runDesktopAction("edit")}
            className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PencilRuler className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={isBusy}
            aria-label={t("app.actions.delete")}
            onClick={() => runDesktopAction("delete")}
            className="size-8 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
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
  showShortcuts: boolean;
  onOpenChange: (id: string, isOpen: boolean) => void;
  onAction: (action: CommandAction, command: CliCommand) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
};

export const CommandList = memo(function CommandList({
  commands,
  openDropdownId,
  busyCommandIds,
  runningCommandIds,
  showShortcuts,
  onOpenChange,
  onAction,
  onReorder,
}: CommandListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = commands.findIndex((command) => command.id === active.id);
      const newIndex = commands.findIndex((command) => command.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const nextIds = arrayMove(commands, oldIndex, newIndex).map((command) => command.id);
      void onReorder(nextIds);
    },
    [commands, onReorder],
  );

  return (
    <ScrollArea className="flex min-h-0 w-full flex-1 flex-col p-1 sm:p-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={commands.map((command) => command.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {commands.map((command, index) => (
              <CommandRow
                key={command.id}
                command={command}
                shortcutNumber={index < MAX_COMMAND_SHORTCUTS ? index + 1 : null}
                showShortcut={showShortcuts}
                isOpen={openDropdownId === command.id}
                isBusy={busyCommandIds.has(command.id)}
                isRunning={runningCommandIds.has(command.id)}
                onOpenChange={onOpenChange}
                onAction={onAction}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </ScrollArea>
  );
});
