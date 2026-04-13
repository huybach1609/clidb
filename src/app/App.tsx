import "./App.css";
import {
  createCommand,
  deleteCommand,
  readCommands,
  type CliCommand,
  updateCommand,
} from "@/lib/cli";
import { Button, toast, Toast } from "@heroui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatIpcError } from "@/lib/tauri/ipcError";
import { CheckCircle, Plus } from "lucide-react";
import { CommandFormModal } from "@/component/CommandFormModal";
import { CommandList, type CommandAction } from "@/component/CommandList";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { AppModal } from "@/component/AppModal";

function App() {
  const [commands, setCommands] = useState<CliCommand[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CliCommand | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [executingIds, setExecutingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());

  // Khai báo state để chứa log của từng command
  // key là command id, value là mảng các dòng text
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [activeLogCommandId, setActiveLogCommandId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    // Lắng nghe dữ liệu stream liên tục
    const unlistenOut = listen("command-stdout", (event) => {
      const payload = event.payload as { id: string; text: string };
      setLogs((prev) => ({
        ...prev,
        [payload.id]: [...(prev[payload.id] || []), payload.text],
      }));
    });

    // Lắng nghe tín hiệu tiến trình kết thúc
    const unlistenDone = listen("command-finished", (event) => {
      const finishedId = event.payload as string;
      setExecutingIds((prev) => {
        const next = new Set(prev);
        next.delete(finishedId);
        return next;
      });
      toast("command finished", {
        actionProps: {
          children: "Dismiss",
          onPress: () => toast.clear(),
          variant: "tertiary",
        },
        description: `Command ${finishedId} finished`,
        indicator: <CheckCircle />,
        variant: "success",
      });
    });

    return () => {
      unlistenOut.then((f) => f());
      unlistenDone.then((f) => f());
    };
  }, []);

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
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((command: CliCommand) => {
    setEditingCommand(command);
    setErrorMessage(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setEditingCommand(null);
    setIsModalOpen(false);
  }, [isSubmitting]);

  const handleSaveCommand = useCallback(
    async (data: CliCommand) => {
      if (isSubmitting) return;
      setErrorMessage(null);
      setIsSubmitting(true);
      const isEdit = commands.some((c) => c.id === data.id);
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
        setIsModalOpen(false);
      } catch (e) {
        console.error("upsert_command failed", e);
        // Fallback to canonical source in case local optimistic state diverges.
        await refresh().catch(() => undefined);
        setErrorMessage(formatIpcError(e));
      } finally {
        setIsSubmitting(false);
      }
    },
    [commands, isSubmitting, refresh],
  );

  const handleDeleteCommand = useCallback(async (id: string) => {
    let previousCommands: CliCommand[] = [];
    setDeletingIds((prev) => new Set(prev).add(id));
    setCommands((prev) => {
      previousCommands = prev;
      return prev.filter((command) => command.id !== id);
    });
    try {
      await deleteCommand(id);
    } catch (e) {
      console.error("delete_command failed", e);
      setCommands(previousCommands);
      setErrorMessage(formatIpcError(e));
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const handleExecuteCommand = useCallback(async (id: string) => {
    setExecutingIds((prev) => new Set(prev).add(id));
    setActiveLogCommandId(id);
    setLogs((prev) => ({ ...prev, [id]: [] }));
    try {
      await invoke("execute_command", { id });
    } catch (e) {
      console.error("execute_command failed", e);
      setErrorMessage(formatIpcError(e));
      setExecutingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const handleMenuAction = useCallback(
    async (actionKey: CommandAction, command: CliCommand) => {
      if (actionKey === "execute") {
        await handleExecuteCommand(command.id);
        setOpenDropdownId(null);
        return;
      }

      if (actionKey === "edit") {
        openEditModal(command);
        setOpenDropdownId(null);
        return;
      }

      if (actionKey === "delete") {
        await handleDeleteCommand(command.id);
        setOpenDropdownId(null);
      }
    },
    [handleDeleteCommand, handleExecuteCommand, openEditModal],
  );

  const handleDropdownOpenChange = useCallback(
    (id: string, isOpen: boolean) => {
      setOpenDropdownId(isOpen ? id : null);
    },
    [],
  );

  const busyCommandIds = useMemo(() => {
    const next = new Set<string>(executingIds);
    deletingIds.forEach((id) => next.add(id));
    return next;
  }, [deletingIds, executingIds]);

  const activeLogCommand = useMemo(
    () => commands.find((command) => command.id === activeLogCommandId) ?? null,
    [activeLogCommandId, commands],
  );
  const activeLogs = activeLogCommandId ? logs[activeLogCommandId] ?? [] : [];
  const isActiveCommandRunning = activeLogCommandId
    ? executingIds.has(activeLogCommandId)
    : false;

  return (
    <main className="h-[9vh] flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-3 p-4">
      <Toast.Provider />
      {errorMessage ? <p className="text-danger">{errorMessage}</p> : null}
      <div className="w-[360px] flex items-center justify-between">
        <h1 className="font-semibold">Commands</h1>
        <Button size="sm" variant="secondary" onClick={openCreateModal}>
          <Plus className="size-4" />
          Create
        </Button>
      </div>
      {commands.length > 0 ? (
        <CommandList
          commands={commands}
          openDropdownId={openDropdownId}
          busyCommandIds={busyCommandIds}
          onOpenChange={handleDropdownOpenChange}
          onAction={handleMenuAction}
        />
      ) : (
        <p>No commands found</p>
      )}
      <CommandFormModal
        isOpen={isModalOpen}
        isSubmitting={isSubmitting}
        initialCommand={editingCommand}
        onClose={closeModal}
        onSave={handleSaveCommand}
      />
      <AppModal.Root
        isOpen={activeLogCommandId !== null}
        onClose={() => setActiveLogCommandId(null)}
        closeOnBackdropClick
      >
        <AppModal.Backdrop className="bg-black/50 backdrop-blur-[1px]" />
        <AppModal.Panel className="w-full max-w-2xl bg-background border border-default-200 shadow-medium">
          <AppModal.Title>Command output</AppModal.Title>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">
                {activeLogCommand?.name ?? "Command output"}
              </p>
              <p className="text-xs text-default-500">
                {isActiveCommandRunning ? "Running..." : "Finished"}
              </p>
            </div>
            <Button
              size="sm"
              variant="tertiary"
              onClick={() => setActiveLogCommandId(null)}
            >
              Close
            </Button>
          </div>
          <div className="h-[320px] overflow-auto rounded-medium border border-default-200 bg-content2 p-3">
            <pre className="font-mono text-xs whitespace-pre-wrap wrap-break-word text-foreground">
              {activeLogs.length > 0
                ? activeLogs.join("")
                : "Waiting for output..."}
            </pre>
          </div>
        </AppModal.Panel>
      </AppModal.Root>
    </main>
  );
}

export default App;
