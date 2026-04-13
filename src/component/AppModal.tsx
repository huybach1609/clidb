
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
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
            "fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center",
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
        "absolute inset-0",
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
        "relative z-1 outline-none rounded-(--radius-outline) p-3",
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

type AppModalTitleProps = {
  children: ReactNode;
};

function AppModalTitle({ children }: AppModalTitleProps) {
  const { titleId } = useAppModalContext();

  return (
    <h2 className="sr-only" id={titleId}>
      {children}
    </h2>
  );
}

export const AppModal = {
  Root: AppModalRoot,
  Backdrop: AppModalBackdrop,
  Panel: AppModalPanel,
  Title: AppModalTitle,
};
