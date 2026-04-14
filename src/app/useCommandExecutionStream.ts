import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { executeCommand } from "@/lib/cli";
import { formatIpcError } from "@/lib/tauri/ipcError";

type CommandStream = "stdout" | "stderr";

export type CommandLogEntry = {
  text: string;
  stream: CommandStream;
};

type CommandExecutionResult = {
  success: boolean;
  exitCode: number | null;
};

const MAX_LOG_LINES_PER_COMMAND = 1000;
const LOG_FLUSH_INTERVAL_MS = 80;

type UseCommandExecutionStreamState = {
  executingIds: Set<string>;
  logs: Record<string, CommandLogEntry[]>;
  commandResults: Record<string, CommandExecutionResult>;
  activeLogCommandId: string | null;
};

type UseCommandExecutionStreamActions = {
  executeById: (id: string) => Promise<void>;
  closeLogModal: () => void;
};

export function useCommandExecutionStream(
  onError: (message: string) => void,
): {
  state: UseCommandExecutionStreamState;
  actions: UseCommandExecutionStreamActions;
} {
  const [executingIds, setExecutingIds] = useState<Set<string>>(() => new Set());
  const [logs, setLogs] = useState<Record<string, CommandLogEntry[]>>({});
  const [commandResults, setCommandResults] = useState<
    Record<string, CommandExecutionResult>
  >({});
  const [activeLogCommandId, setActiveLogCommandId] = useState<string | null>(
    null,
  );
  const logBufferRef = useRef<Record<string, CommandLogEntry[]>>({});
  const logFlushTimerRef = useRef<number | null>(null);

  const flushBufferedLogs = useCallback(() => {
    const bufferedLogs = logBufferRef.current;
    const bufferedCommandIds = Object.keys(bufferedLogs);
    if (bufferedCommandIds.length === 0) return;

    setLogs((prev) => {
      let hasChanged = false;
      const next = { ...prev };

      bufferedCommandIds.forEach((commandId) => {
        const entries = bufferedLogs[commandId];
        if (!entries || entries.length === 0) return;

        const merged = [...(next[commandId] ?? []), ...entries];
        next[commandId] = merged.slice(-MAX_LOG_LINES_PER_COMMAND);
        hasChanged = true;
      });

      return hasChanged ? next : prev;
    });

    logBufferRef.current = {};
  }, []);

  const scheduleLogFlush = useCallback(() => {
    if (logFlushTimerRef.current !== null) return;

    logFlushTimerRef.current = window.setTimeout(() => {
      logFlushTimerRef.current = null;
      flushBufferedLogs();
    }, LOG_FLUSH_INTERVAL_MS);
  }, [flushBufferedLogs]);

  useEffect(() => {
    const unlistenOut = listen("command-log", (event) => {
      const payload = event.payload as {
        id: string;
        text: string;
        stream?: CommandStream;
      };

      if (!logBufferRef.current[payload.id]) {
        logBufferRef.current[payload.id] = [];
      }

      logBufferRef.current[payload.id].push({
        text: payload.text,
        stream: payload.stream ?? "stdout",
      });
      scheduleLogFlush();
    });

    const unlistenDone = listen("command-finished", (event) => {
      const payload = event.payload as
        | string
        | { id: string; success: boolean; exit_code?: number | null };

      const finishedId = typeof payload === "string" ? payload : payload.id;
      setExecutingIds((prev) => {
        const next = new Set(prev);
        next.delete(finishedId);
        return next;
      });

      if (typeof payload !== "string") {
        setCommandResults((prev) => ({
          ...prev,
          [payload.id]: {
            success: payload.success,
            exitCode: payload.exit_code ?? null,
          },
        }));
      }
    });

    return () => {
      if (logFlushTimerRef.current !== null) {
        window.clearTimeout(logFlushTimerRef.current);
        logFlushTimerRef.current = null;
      }
      flushBufferedLogs();
      unlistenOut.then((f) => f());
      unlistenDone.then((f) => f());
    };
  }, [flushBufferedLogs, scheduleLogFlush]);

  const executeById = useCallback(
    async (id: string) => {
      let shouldExecute = false;
      setExecutingIds((prev) => {
        if (prev.has(id)) return prev;
        shouldExecute = true;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setActiveLogCommandId(id);
      if (!shouldExecute) return;
      setLogs((prev) => ({ ...prev, [id]: [] }));
      setCommandResults((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      try {
        await executeCommand(id);
      } catch (e) {
        console.error("execute_command failed", e);
        onError(formatIpcError(e));
        setExecutingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [onError],
  );

  const closeLogModal = useCallback(() => {
    setActiveLogCommandId(null);
  }, []);

  return {
    state: {
      executingIds,
      logs,
      commandResults,
      activeLogCommandId,
    },
    actions: {
      executeById,
      closeLogModal,
    },
  };
}
