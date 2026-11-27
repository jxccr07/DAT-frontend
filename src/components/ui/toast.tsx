"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import clsx from "clsx";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<((kind: ToastKind, message: string) => void) | null>(null);

/** Non-blocking notifications (replaces window.alert). Announced to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((all) => [...all.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const icons = { success: CheckCircle2, error: XCircle, info: Info };

  return (
    <ToastContext value={push}>
      {children}
      <div
        aria-live="polite"
        className="no-print pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:end-6 sm:bottom-6 sm:items-end"
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.kind];
          return (
            <div
              key={toast.id}
              role={toast.kind === "error" ? "alert" : "status"}
              className={clsx(
                "card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-3.5 shadow-lg",
                "animate-[toast-in_.2s_ease-out]",
              )}
            >
              <Icon
                aria-hidden
                className={clsx(
                  "mt-0.5 size-5 shrink-0",
                  toast.kind === "success" && "text-ok",
                  toast.kind === "error" && "text-bad",
                  toast.kind === "info" && "text-info",
                )}
              />
              <p className="flex-1 text-sm">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-muted hover:text-fg"
                aria-label="×"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </ToastContext>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast must be used inside ToastProvider");
  return push;
}
