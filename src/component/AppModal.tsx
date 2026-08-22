
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  createContext,
  use,
  useEffect,
  useId,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

type AppModalContextValue = {
  titleId: string;
  onClose: () => void;
  closeOnBackdropClick: boolean;
};

const AppModalContext = createContext<AppModalContextValue | null>(null);

function useAppModalContext(): AppModalContextValue {
  const value = use(AppModalContext);

  if (!value) {
    throw new Error("AppModal.Title must be used inside AppModal.Root");
  }

  return value;
}

type AppModalRootProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Outer flex shell (placement, padding). */
  className?: string;
  /** When true, clicking the backdrop calls `onClose`. */
  closeOnBackdropClick?: boolean;
  /**
   * Optional capture-phase handler while open (e.g. Cmd+S).
   * Runs before Escape handling; Escape still calls `onClose`.
   */
  onWindowKeyDown?: (e: KeyboardEvent) => void;
};

function AppModalRoot({
  isOpen,
  onClose,
  children,
  className,
  closeOnBackdropClick = false,
  onWindowKeyDown,
}: AppModalRootProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      onWindowKeyDown?.(e);
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    const prevOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, onWindowKeyDown]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="app-modal-shell"
          animate={{ opacity: 1 }}
          aria-labelledby={titleId}
          aria-modal="true"
          className={clsx(
            "fixed inset-0 z-100 flex items-end justify-center p-4 sm:items-center",
            className,
          )}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          role="dialog"
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <AppModalContext.Provider
            value={{
              titleId,
              onClose,
              closeOnBackdropClick,
            }}
          >
            {children}
          </AppModalContext.Provider>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

type AppModalBackdropProps = {
  className?: string;
};

function AppModalBackdrop({ className }: AppModalBackdropProps) {
  const { onClose, closeOnBackdropClick } = useAppModalContext();

  return (
    <div
      aria-hidden
      className={clsx(
        "absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity",
        closeOnBackdropClick && "cursor-pointer",
        className,
      )}
      onClick={closeOnBackdropClick ? () => onClose() : undefined}
    />
  );
}

type AppModalPanelProps = {
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement | null>;
};

function AppModalPanel({ className, children, ref }: AppModalPanelProps) {
  return (
    <motion.div
      ref={ref}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={clsx(
        "relative z-1 flex w-full max-h-[min(90vh,44rem)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl outline-none",
        className,
      )}
      exit={{ opacity: 0, scale: 0.98, y: 10 }}
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

type AppModalHeaderProps = {
  children?: ReactNode;
  className?: string;
  onClose?: () => void;
};

function AppModalHeader({ children, className, onClose }: AppModalHeaderProps) {
  const context = use(AppModalContext);
  const handleClose = onClose ?? context?.onClose;

  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3 px-5 py-4 border-b border-border/60",
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {handleClose ? (
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleClose}
          className="size-7 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
          aria-label="Close"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

type AppModalBodyProps = {
  className?: string;
  children?: ReactNode;
};

function AppModalBody({ className, children }: AppModalBodyProps) {
  return (
    <ScrollArea className={clsx("min-h-0 flex-1 overflow-y-auto", className)}>
      {children}
    </ScrollArea>
  );
}

type AppModalFooterProps = {
  className?: string;
  children?: ReactNode;
};

function AppModalFooter({ className, children }: AppModalFooterProps) {
  return (
    <div
      className={clsx(
        "px-5 py-3.5 flex items-center justify-end gap-2.5 border-t border-border/60 bg-muted/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

type AppModalTitleProps = {
  children: ReactNode;
  className?: string;
};

function AppModalTitle({ children, className }: AppModalTitleProps) {
  const { titleId } = useAppModalContext();

  return (
    <h2 className={clsx("font-semibold text-base tracking-tight text-foreground", className)} id={titleId}>
      {children}
    </h2>
  );
}

export const AppModal = {
  Root: AppModalRoot,
  Backdrop: AppModalBackdrop,
  Panel: AppModalPanel,
  Header: AppModalHeader,
  Body: AppModalBody,
  Footer: AppModalFooter,
  Title: AppModalTitle,
};
