import { useEffect, useState } from "react";
import type { CliCommand } from "@/lib/cli";

/** Phím tắt chạy lệnh: Ctrl (Windows/Linux) hoặc Cmd (macOS) + 1..9. */
export const MAX_COMMAND_SHORTCUTS = 9;

const DIGIT_CODE_PATTERN = /^(?:Digit|Numpad)([1-9])$/;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

type UseCommandHotkeysOptions = {
  commands: CliCommand[];
  enabled: boolean;
  isCommandBlocked: (id: string) => boolean;
  onRun: (command: CliCommand) => void;
};

/**
 * Lắng nghe Ctrl/Cmd+1..9 để chạy lệnh theo vị trí hiển thị.
 * Trả về `isModifierHeld` để UI hiện gợi ý số khi đang giữ phím.
 */
export function useCommandHotkeys({
  commands,
  enabled,
  isCommandBlocked,
  onRun,
}: UseCommandHotkeysOptions): boolean {
  const [isModifierHeld, setIsModifierHeld] = useState(false);

  useEffect(() => {
    const syncModifier = (e: KeyboardEvent) => {
      setIsModifierHeld(e.ctrlKey || e.metaKey);
    };
    const clearModifier = () => setIsModifierHeld(false);

    window.addEventListener("keydown", syncModifier);
    window.addEventListener("keyup", syncModifier);
    window.addEventListener("blur", clearModifier);
    return () => {
      window.removeEventListener("keydown", syncModifier);
      window.removeEventListener("keyup", syncModifier);
      window.removeEventListener("blur", clearModifier);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.repeat) return;

      const match = DIGIT_CODE_PATTERN.exec(e.code);
      if (!match) return;

      const command = commands[Number(match[1]) - 1];
      if (!command || isEditableTarget(e.target)) return;

      e.preventDefault();
      if (isCommandBlocked(command.id)) return;
      onRun(command);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commands, enabled, isCommandBlocked, onRun]);

  return isModifierHeld && enabled;
}
