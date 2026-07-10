"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { CheckCircle2, AlertTriangle, X, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (title: string, options?: { description?: string; type?: ToastType }) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((title: string, options?: { description?: string; type?: ToastType }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description: options?.description, type: options?.type || "success" }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-[var(--sh-lg)] border w-[320px] backdrop-blur-md",
                t.type === "success" && "bg-surface border-line text-ink",
                t.type === "error" && "bg-bad-soft border-bad/30 text-ink",
                t.type === "info" && "bg-brand-50 border-brand-100 text-ink"
              )}
            >
              <div className="flex-none mt-0.5">
                {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-good" />}
                {t.type === "error" && <AlertTriangle className="w-5 h-5 text-bad" />}
                {t.type === "info" && <Info className="w-5 h-5 text-brand" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{t.title}</div>
                {t.description && <div className="text-[12px] text-muted-2 mt-0.5 line-clamp-2 leading-snug">{t.description}</div>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="flex-none p-1 -mr-1 -mt-1 rounded-lg text-muted hover:text-ink hover:bg-line/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
