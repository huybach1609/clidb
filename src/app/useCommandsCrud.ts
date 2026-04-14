import { useCallback, useEffect, useState } from "react";
import {
  createCommand,
  deleteCommand,
  readCommands,
  type CliCommand,
  updateCommand,
} from "@/lib/cli";
import { formatIpcError } from "@/lib/tauri/ipcError";

type UseCommandsCrudState = {
  commands: CliCommand[];
  editingCommand: CliCommand | null;
  isFormModalOpen: boolean;
  isSubmitting: boolean;
  deletingIds: Set<string>;
  errorMessage: string | null;
};

type UseCommandsCrudActions = {
  refresh: () => Promise<void>;
  openCreateModal: () => void;
  openEditModal: (command: CliCommand) => void;
  closeModal: () => void;
  clearError: () => void;
  setError: (message: string) => void;
  saveCommand: (data: CliCommand) => Promise<void>;
  deleteCommandById: (id: string) => Promise<void>;
};

export function useCommandsCrud(): {
  state: UseCommandsCrudState;
  actions: UseCommandsCrudActions;
} {
  const [commands, setCommands] = useState<CliCommand[]>([]);
  const [editingCommand, setEditingCommand] = useState<CliCommand | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = (await readCommands()) as CliCommand[];
    setCommands(next);
  }, []);

  useEffect(() => {
    refresh().catch((e) => {
      console.error("get_all_commands failed", e);
      setErrorMessage(formatIpcError(e));
    });
  }, [refresh]);

  const openCreateModal = useCallback(() => {
    setEditingCommand(null);
    setErrorMessage(null);
    setIsFormModalOpen(true);
  }, []);

  const openEditModal = useCallback((command: CliCommand) => {
    setEditingCommand(command);
    setErrorMessage(null);
    setIsFormModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setEditingCommand(null);
    setIsFormModalOpen(false);
  }, [isSubmitting]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);
  const setError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const saveCommand = useCallback(
    async (data: CliCommand) => {
      if (isSubmitting) return;
      setErrorMessage(null);
      setIsSubmitting(true);
      const isEdit = commands.some((command) => command.id === data.id);
      try {
        if (isEdit) {
          await updateCommand(data);
          setCommands((prev) =>
            prev.map((command) => (command.id === data.id ? data : command)),
          );
        } else {
          await createCommand(data);
          setCommands((prev) => [...prev, data]);
        }
        setEditingCommand(null);
        setIsFormModalOpen(false);
      } catch (e) {
        console.error("upsert_command failed", e);
        await refresh().catch(() => undefined);
        setErrorMessage(formatIpcError(e));
      } finally {
        setIsSubmitting(false);
      }
    },
    [commands, isSubmitting, refresh],
  );

  const deleteCommandById = useCallback(async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteCommand(id);
      setCommands((prev) => prev.filter((command) => command.id !== id));
    } catch (e) {
      console.error("delete_command failed", e);
      setErrorMessage(formatIpcError(e));
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  return {
    state: {
      commands,
      editingCommand,
      isFormModalOpen,
      isSubmitting,
      deletingIds,
      errorMessage,
    },
    actions: {
      refresh,
      openCreateModal,
      openEditModal,
      closeModal,
      clearError,
      setError,
      saveCommand,
      deleteCommandById,
    },
  };
}
