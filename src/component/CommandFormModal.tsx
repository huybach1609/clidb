import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AppModal } from "@/component/AppModal";
import type { CliCommand } from "@/lib/cli";
import { useTranslation } from "react-i18next";

const RESTRICTED_ENVS = new Set(["PATH", "HOME", "USER", "PWD", "SHELL"]);

function stringifyEnvs(envs: Record<string, string>): string {
  return Object.entries(envs)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function parseEnvs(
  input: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): {
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
        error: t("app.form.validation.envLineInvalid", { line: i + 1 }),
      };
    }

    const key = raw.slice(0, separatorIndex).trim();
    const value = raw.slice(separatorIndex + 1);

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      return {
        envs: {},
        error: t("app.form.validation.envKeyInvalid", { line: i + 1, key }),
      };
    }

    if (RESTRICTED_ENVS.has(key)) {
      return {
        envs: {},
        error: t("app.form.validation.envRestricted", { key }),
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

type FieldErrors = {
  name?: string;
  command?: string;
  envs?: string;
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
  const { t } = useTranslation();
  const [draftCommand, setDraftCommand] = useState<CliCommand>(EMPTY_COMMAND);
  const [envInput, setEnvInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const nextCommand = initialCommand ? { ...initialCommand } : EMPTY_COMMAND;
    const nextEnvInput = stringifyEnvs(nextCommand.envs ?? {});
    setDraftCommand(nextCommand);
    setEnvInput(nextEnvInput);
    setErrorMessage(null);
    setFieldErrors({});
    setIsAdvancedOpen(
      nextCommand.requires_root || nextEnvInput.trim().length > 0,
    );
  }, [isOpen, initialCommand]);

  const handleSave = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    const nextFieldErrors: FieldErrors = {};

    if (!draftCommand.name.trim()) {
      nextFieldErrors.name = t("app.form.validation.nameRequired");
    }

    if (!draftCommand.command.trim()) {
      nextFieldErrors.command = t("app.form.validation.commandRequired");
    }

    const parsedEnvs = parseEnvs(envInput, t);
    if (parsedEnvs.error) {
      nextFieldErrors.envs = parsedEnvs.error;
      setIsAdvancedOpen(true);
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setErrorMessage(t("app.form.validation.fixHighlighted"));
      return;
    }

    setFieldErrors({});
    await onSave({
      ...draftCommand,
      id: draftCommand.id || crypto.randomUUID(),
      envs: parsedEnvs.envs,
    });
  };

  const title = draftCommand.id
    ? t("app.form.title.update")
    : t("app.form.title.create");

  return (
    <AppModal.Root isOpen={isOpen} onClose={onClose} closeOnBackdropClick>
      <AppModal.Backdrop />
      <AppModal.Panel className="w-full max-w-md">
        <AppModal.Header onClose={onClose}>
          <AppModal.Title>{title}</AppModal.Title>
        </AppModal.Header>
        <div className="flex min-h-0 flex-1 flex-col">
          {errorMessage ? (
            <p aria-live="polite" className="text-destructive text-xs font-medium px-5 pt-3">
              {errorMessage}
            </p>
          ) : null}
          <AppModal.Body>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="command-name" className="text-xs font-medium">
                  {t("app.form.fields.name")}
                </Label>
                <Input
                  id="command-name"
                  type="text"
                  placeholder={t("app.form.placeholders.name")}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={
                    fieldErrors.name
                      ? "command-name-error"
                      : "command-name-helper"
                  }
                  value={draftCommand.name}
                  onChange={(e) => {
                    setDraftCommand((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }));
                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                />
                {fieldErrors.name ? (
                  <p className="text-destructive text-xs" id="command-name-error">
                    {fieldErrors.name}
                  </p>
                ) : (
                  <p
                    className="text-muted-foreground text-xs"
                    id="command-name-helper"
                  >
                    {t("app.form.helpers.name")}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="command-input" className="text-xs font-medium">
                  {t("app.form.fields.command")}
                </Label>
                <Textarea
                  id="command-input"
                  aria-describedby={
                    fieldErrors.command
                      ? "command-input-error"
                      : "command-input-help"
                  }
                  aria-invalid={Boolean(fieldErrors.command)}
                  rows={4}
                  className="font-mono text-xs leading-relaxed"
                  placeholder={t("app.form.placeholders.command")}
                  value={draftCommand.command}
                  onChange={(e) => {
                    setDraftCommand((prev) => ({
                      ...prev,
                      command: e.target.value,
                    }));
                    setFieldErrors((prev) => ({ ...prev, command: undefined }));
                  }}
                />
                {fieldErrors.command ? (
                  <p className="text-destructive text-xs" id="command-input-error">
                    {fieldErrors.command}
                  </p>
                ) : (
                  <p
                    className="text-muted-foreground text-xs"
                    id="command-input-help"
                  >
                    {t("app.form.helpers.command")}
                  </p>
                )}
              </div>
              <Separator />

              <Accordion
                value={isAdvancedOpen ? ["advanced"] : []}
                onValueChange={(val) => setIsAdvancedOpen(val.includes("advanced"))}
              >
                <AccordionItem value="advanced" className="border-none">
                  <AccordionTrigger className="text-xs font-medium py-1.5 hover:no-underline text-muted-foreground hover:text-foreground">
                    {t("app.form.sections.advanced")}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="mt-2.5 flex flex-col gap-3.5 px-0.5 pb-1">
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-muted/30 p-2.5">
                        <Switch
                          id="requires-root"
                          checked={draftCommand.requires_root}
                          onCheckedChange={(checked) =>
                            setDraftCommand((prev) => ({
                              ...prev,
                              requires_root: checked,
                            }))
                          }
                        />
                        <Label htmlFor="requires-root" className="text-xs cursor-pointer select-none font-medium">
                          {t("app.form.fields.requiresRoot")}
                        </Label>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="command-envs" className="text-xs font-medium">
                          {t("app.form.fields.envs")}
                        </Label>
                        <Textarea
                          rows={4}
                          id="command-envs"
                          aria-describedby={
                            fieldErrors.envs
                              ? "command-envs-error"
                              : "command-envs-help"
                          }
                          aria-invalid={Boolean(fieldErrors.envs)}
                          className="font-mono text-xs leading-relaxed"
                          placeholder={t("app.form.placeholders.envs")}
                          value={envInput}
                          onChange={(e) => {
                            setEnvInput(e.target.value);
                            setFieldErrors((prev) => ({
                              ...prev,
                              envs: undefined,
                            }));
                          }}
                        />
                        {fieldErrors.envs ? (
                          <p
                            className="text-destructive text-xs"
                            id="command-envs-error"
                          >
                            {fieldErrors.envs}
                          </p>
                        ) : (
                          <p
                            className="text-muted-foreground text-xs"
                            id="command-envs-help"
                          >
                            {t("app.form.helpers.envs")}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </AppModal.Body>
          <AppModal.Footer>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("app.actions.cancel")}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
              {draftCommand.id ? t("app.actions.update") : t("app.actions.create")}
            </Button>
          </AppModal.Footer>
        </div>
      </AppModal.Panel>
    </AppModal.Root>
  );
}
