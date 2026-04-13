import i18n from "../../i18n";

/** Payload shape returned from Rust `IpcError` (camelCase via serde). */
export type IpcErrorPayload = {
  messageKey: string;
  detail?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Normalize a failed `invoke()` rejection into {@link IpcErrorPayload} when the
 * backend used {@code IpcError}. Tauri may surface this as an object or as JSON in a string / Error#message.
 */
export function parseIpcError(error: unknown): IpcErrorPayload | null {
  if (isRecord(error) && typeof error.messageKey === "string") {
    const detail = error.detail;
    return {
      messageKey: error.messageKey,
      detail: typeof detail === "string" ? detail : undefined,
    };
  }

  const tryParse = (raw: string): IpcErrorPayload | null => {
    try {
      const v = JSON.parse(raw) as unknown;
      if (isRecord(v) && typeof v.messageKey === "string") {
        const detail = v.detail;
        return {
          messageKey: v.messageKey,
          detail: typeof detail === "string" ? detail : undefined,
        };
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  if (typeof error === "string") {
    return tryParse(error);
  }

  if (error instanceof Error && error.message) {
    return tryParse(error.message);
  }

  return null;
}

/** User-facing string: translated key, optional technical detail in dev builds. */
export function formatIpcError(error: unknown): string {
  const parsed = parseIpcError(error);
  if (parsed) {
    const msg = i18n.t(parsed.messageKey);
    if (import.meta.env.DEV && parsed.detail) {
      return `${msg} (${parsed.detail})`;
    }
    return msg;
  }
  return i18n.t("errors.unknown");
}
