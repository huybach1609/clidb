import { useEffect, useState } from "react";
import { Button, Checkbox, Input, Label, TextArea } from "@heroui/react";
import { AppModal } from "@/component/AppModal";
import type { CliCommand } from "@/lib/cli";

const RESTRICTED_ENVS = new Set(["PATH", "HOME", "USER", "PWD", "SHELL"]);

function stringifyEnvs(envs: Record<string, string>): string {
  return Object.entries(envs)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function parseEnvs(input: string): {
  envs: Record<string, string>;
  error?: string;
} {
  const envs: Record<string, string> = {};
  const lines = input.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const separatorIndex = raw.indexOf("=");
    if (separatorIndex <= 0) {
      return {
        envs: {},
        error: `Env line ${i + 1} không hợp lệ. Dùng định dạng KEY=VALUE.`,
      };
    }

    const key = raw.slice(0, separatorIndex).trim();
    const value = raw.slice(separatorIndex + 1);

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      return {
        envs: {},
        error: `Tên biến môi trường không hợp lệ ở dòng ${i + 1}: ${key}`,
      };
    }

    if (RESTRICTED_ENVS.has(key)) {
      return {
        envs: {},
        error: `Không được phép ghi đè biến hệ thống: ${key}`,
      };
    }

    envs[key] = value;
  }

  return { envs };
}

type CommandFormModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  initialCommand: CliCommand | null;
  onClose: () => void;
  onSave: (command: CliCommand) => Promise<void>;
};

const EMPTY_COMMAND: CliCommand = {
  id: "",
  name: "",
  command: "",
  requires_root: false,
  envs: {},
};

export function CommandFormModal({
  isOpen,
  isSubmitting,
  initialCommand,
  onClose,
  onSave,
}: CommandFormModalProps) {
  const [draftCommand, setDraftCommand] = useState<CliCommand>(EMPTY_COMMAND);
  const [envInput, setEnvInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const nextCommand = initialCommand ? { ...initialCommand } : EMPTY_COMMAND;
    setDraftCommand(nextCommand);
    setEnvInput(stringifyEnvs(nextCommand.envs ?? {}));
    setErrorMessage(null);
  }, [isOpen, initialCommand]);

  const handleSave = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);

    const parsedEnvs = parseEnvs(envInput);
    if (parsedEnvs.error) {
      setErrorMessage(parsedEnvs.error);
      return;
    }

    await onSave({
      ...draftCommand,
      id: draftCommand.id || crypto.randomUUID(),
      envs: parsedEnvs.envs,
    });
  };

  const title = draftCommand.id ? "Update command" : "Create command";

  return (
    <AppModal.Root isOpen={isOpen} onClose={onClose} closeOnBackdropClick>
      <AppModal.Backdrop className="bg-black/50 backdrop-blur-[1px]" />
      <AppModal.Panel className="w-full max-w-md bg-background border border-default-200 shadow-medium">
        <AppModal.Title>{title}</AppModal.Title>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {errorMessage ? <p className="text-danger">{errorMessage}</p> : null}
          <Input
            type="text"
            placeholder="Command Name"
            value={draftCommand.name}
            onChange={(e) =>
              setDraftCommand((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <TextArea
            aria-describedby="command-description"
            aria-label="Command"
            className="font-mono"
            placeholder="Command"
            value={draftCommand.command}
            onChange={(e) =>
              setDraftCommand((prev) => ({ ...prev, command: e.target.value }))
            }
          />
          <Checkbox
            isSelected={draftCommand.requires_root}
            onChange={(checked: boolean) =>
              setDraftCommand((prev) => ({
                ...prev,
                requires_root: checked,
              }))
            }
          >
            <Checkbox.Control></Checkbox.Control>
            <Checkbox.Content>
              <Label>Requires root</Label>
            </Checkbox.Content>
          </Checkbox>
          <TextArea
            aria-label="Environment variables"
            className="font-mono"
            placeholder={"Environment variables (KEY=VALUE)\nExample:\nAPP_MODE=dev"}
            value={envInput}
            onChange={(e) => setEnvInput(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="tertiary" onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} isDisabled={isSubmitting}>
              {draftCommand.id ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </AppModal.Panel>
    </AppModal.Root>
  );
}
