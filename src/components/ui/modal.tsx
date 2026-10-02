"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const maxW = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-3xl",
    full: "max-w-6xl",
  }[size];

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(14px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.28 }}
            onClick={onClose}
            className="absolute inset-0 bg-scrim/45"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "glass-strong grain relative max-h-[88dvh] w-full overflow-hidden rounded-4xl",
              maxW,
              className,
            )}
          >
            {(title || description) && (
              <header className="flex items-start justify-between gap-6 border-b border-fg/8 px-6 py-5">
                <div className="min-w-0">
                  {title && (
                    <h2 className="font-display text-2xl leading-tight text-fg">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-fg-2">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="-mt-1 shrink-0 rounded-full p-2 text-fg-3 transition-colors hover:bg-fg/7 hover:text-fg"
                >
                  <X className="size-5" />
                </button>
              </header>
            )}
            <div className="max-h-[calc(88dvh-9rem)] overflow-y-auto px-6 py-5">
              {children}
            </div>
            {footer && (
              <footer className="flex items-center justify-end gap-3 border-t border-fg/8 bg-fg/[0.02] px-6 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Bottom sheet on mobile, centred dialog on desktop. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      className="sm:max-w-md"
    >
      {children}
    </Modal>
  );
}