import { createContext, use, type ReactNode } from "react";
import type { CliCommand } from "@/lib/cli";
import type { CommandAction } from "@/component/CommandList";
import type { CommandLogEntry } from "@/app/useCommandExecutionStream";

type CommandExecutionResult = {
  success: boolean;
  exitCode: number | null;
};

export type CommandPageContextValue = {
  state: {
    commands: CliCommand[];
    openDropdownId: string | null;
    busyCommandIds: Set<string>;
    runningCommandIds: Set<string>;
    errorMessage: string | null;
    isFormModalOpen: boolean;
    isSubmitting: boolean;
    editingCommand: CliCommand | null;
    activeLogCommand: CliCommand | null;
    activeLogs: CommandLogEntry[];
    activeLogResult?: CommandExecutionResult;
    activeStderrCount: number;
    isActiveCommandRunning: boolean;
  };
  actions: {
    onOpenDropdownChange: (id: string, isOpen: boolean) => void;
    onMenuAction: (actionKey: CommandAction, command: CliCommand) => Promise<void>;
    openCreateModal: () => void;
    closeFormModal: () => void;
    saveCommand: (command: CliCommand) => Promise<void>;
    closeLogModal: () => void;
    clearError: () => void;
  };
  meta: {
    activeStatusText: string;
  };
};

const CommandPageContext = createContext<CommandPageContextValue | null>(null);

export function CommandPageProvider({
  value,
  children,
}: {
  value: CommandPageContextValue;
  children: ReactNode;
}) {
  return (
    <CommandPageContext.Provider value={value}>
      {children}
    </CommandPageContext.Provider>
  );
}

export function useCommandPageContext(): CommandPageContextValue {
  const value = use(CommandPageContext);
  if (!value) {
    throw new Error("useCommandPageContext must be used inside CommandPageProvider");
  }
  return value;
}
