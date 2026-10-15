"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import Notice, { type NoticeTone } from "./Notice";

type ToastItem = { id: number; tone: NoticeTone; message: string };
type ToastApi = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

// Errors stay a little longer than confirmations so they can be read.
const DURATION_MS: Record<NoticeTone, number> = { success: 4000, error: 6500 };
const MAX_VISIBLE = 3;

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const nextId = useRef(0);

  // Fade the toast out first (180ms), then drop it from the list.
  const dismiss = useCallback((id: number) => {
    setLeaving((ids) => new Set(ids).add(id));
    setTimeout(() => {
      setToasts((items) => items.filter((t) => t.id !== id));
      setLeaving((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }, 180);
  }, []);

  const push = useCallback(
    (tone: NoticeTone, message: string) => {
      const id = ++nextId.current;
      setToasts((items) => [...items.slice(-(MAX_VISIBLE - 1)), { id, tone, message }]);
      setTimeout(() => dismiss(id), DURATION_MS[tone]);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto relative w-full max-w-md shadow-card rounded-xl ${leaving.has(t.id) ? "animate-toast-out" : "animate-fade-in"}`}>
            <Notice tone={t.tone} className="pr-11">
              {t.message}
            </Notice>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss message"
              className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-full opacity-70 hover:opacity-100"
              style={{ color: t.tone === "success" ? "var(--success-ink)" : "var(--primary-ink)" }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
