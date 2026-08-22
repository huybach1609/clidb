import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Square, X } from "lucide-react";

export function WindowControls() {
  const [appWindow, setAppWindow] = useState<ReturnType<typeof getCurrentWindow> | null>(null);

  useEffect(() => {
    try {
      const win = getCurrentWindow();
      setAppWindow(win);
    } catch {
      /* not in tauri environment */
    }
  }, []);

  const handleMinimize = useCallback(() => {
    if (appWindow) {
      void appWindow.minimize().catch(() => {});
    }
  }, [appWindow]);

  const handleMaximize = useCallback(() => {
    if (appWindow) {
      void appWindow.toggleMaximize().catch(() => {});
    }
  }, [appWindow]);

  const handleClose = useCallback(() => {
    if (appWindow) {
      void appWindow.close().catch(() => {});
    }
  }, [appWindow]);

  return (
    <div className="flex items-center gap-0.5 border-l border-border/40 pl-1.5 ml-1">
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={handleMinimize}
        className="size-7 text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
        aria-label="Minimize"
      >
        <Minus className="size-3.5" />
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={handleMaximize}
        className="size-7 text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
        aria-label="Maximize"
      >
        <Square className="size-3" />
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={handleClose}
        className="size-7 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground rounded-md cursor-pointer"
        aria-label="Close"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
