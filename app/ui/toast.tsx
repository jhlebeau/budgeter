"use client";

import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ToastType = "error" | "success";
type ToastEntry = { id: number; message: string; type: ToastType };
type ToastContextValue = { addToast: (message: string, type?: ToastType) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = "error") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`pointer-events-auto flex items-start gap-3 max-w-sm rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl
                  ${toast.type === "error"
                    ? "border-red-400/30 bg-slate-900 text-red-200"
                    : "border-emerald-400/30 bg-slate-900 text-emerald-200"
                  }`}
              >
                <span className="flex-1">{toast.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="shrink-0 text-slate-500 hover:text-slate-300 transition"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
