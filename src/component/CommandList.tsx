import { memo, useCallback } from "react";
import { Button, Dropdown, Label } from "@heroui/react";
import { PencilRuler, Play, Trash2 } from "lucide-react";
import type { CliCommand } from "@/lib/cli";

export type CommandAction = "execute" | "edit" | "delete";

type CommandRowProps = {
  command: CliCommand;
  isOpen: boolean;
  isBusy: boolean;
  onOpenChange: (id: string, isOpen: boolean) => void;
  onAction: (action: CommandAction, command: CliCommand) => Promise<void>;
};

const CommandRow = memo(function CommandRow({
  command,
  isOpen,
  isBusy,
  onOpenChange,
  onAction,
}: CommandRowProps) {
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

  return (
    <div className="p-0">
      <Dropdown isOpen={isOpen} onOpenChange={handleOpenChange}>
        <Dropdown.Trigger className="w-full">
          <Button
            variant="ghost"
            className="h-auto w-full min-h-20 justify-start px-3 py-2.5 rounded-(--radius)"
            aria-label={`Open actions for ${command.name}`}
            isDisabled={isBusy}
          >
            <div className="min-w-0 flex-1 space-y-1 text-left">
              <div className="font-bold text-sm leading-5 wrap-break-word">
                {command.name}
              </div>
              <div className="text-xs leading-4 opacity-70 break-all">
                {command.command}
              </div>
            </div>
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Popover className="rounded-(--radius-outline)">
          <Dropdown.Menu onAction={handleAction}>
            <Dropdown.Item id="execute" key="execute">
              <Play className="size-4 shrink-0 text-success" />
              <Label className="text-success">Execute</Label>
            </Dropdown.Item>
            <Dropdown.Item id="edit" key="edit">
              <PencilRuler className="size-4 shrink-0 text-muted" />
              <Label>Edit</Label>
            </Dropdown.Item>
            <Dropdown.Item id="delete" key="delete">
              <Trash2 className="size-4 shrink-0 text-danger" />
              <Label className="text-danger">Delete</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
});

type CommandListProps = {
  commands: CliCommand[];
  openDropdownId: string | null;
  busyCommandIds: Set<string>;
  onOpenChange: (id: string, isOpen: boolean) => void;
  onAction: (action: CommandAction, command: CliCommand) => Promise<void>;
};

export const CommandList = memo(function CommandList({
  commands,
  openDropdownId,
  busyCommandIds,
  onOpenChange,
  onAction,
}: CommandListProps) {
  return (
    <div className="w-[360px] h-[90vh] overflow-y-auto rounded-medium border border-default-200 rounded-(--radius-outline) p-3">
      {commands.map((command) => (
        <CommandRow
          key={command.id}
          command={command}
          isOpen={openDropdownId === command.id}
          isBusy={busyCommandIds.has(command.id)}
          onOpenChange={onOpenChange}
          onAction={onAction}
        />
      ))}
    </div>
  );
});
