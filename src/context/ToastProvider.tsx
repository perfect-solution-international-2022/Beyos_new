"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}
interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setDialog(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toasts */}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 animate-fade-up ${
              t.type === "success"
                ? "bg-white text-navy-800 ring-emerald-200"
                : t.type === "error"
                  ? "bg-white text-navy-800 ring-red-200"
                  : "bg-white text-navy-800 ring-navy-800/10"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                t.type === "success"
                  ? "bg-emerald-100 text-emerald-600"
                  : t.type === "error"
                    ? "bg-red-100 text-red-600"
                    : "bg-navy-100 text-navy-700"
              }`}
            >
              {t.type === "success" ? "✓" : t.type === "error" ? "!" : "i"}
            </span>
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {dialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-navy-900/50 p-4" onClick={() => close(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${dialog.danger ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-bold text-navy-800">{dialog.title ?? "Are you sure?"}</h3>
                <p className="mt-1 text-sm text-navy-800/60">{dialog.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => close(false)} className="btn-outline">{dialog.cancelText ?? "Cancel"}</button>
              <button
                onClick={() => close(true)}
                className={`btn ${dialog.danger ? "bg-red-500 text-white hover:bg-red-600" : "btn-primary"}`}
              >
                {dialog.confirmText ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
