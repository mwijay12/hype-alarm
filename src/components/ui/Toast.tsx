import React from "react";
import { create } from "zustand";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export type ToastVariant = "success" | "info" | "warning" | "danger";

interface ToastItem {
  id: string;
  message: string;
  variant?: ToastVariant;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, variant?: ToastVariant) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, variant = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 2800);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Quick helper to show toasts anywhere
export const showToast = (message: string, variant: ToastVariant = "success") => {
  useToastStore.getState().addToast(message, variant);
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-blue-100 min-w-[260px] max-w-sm ${
                toast.variant === "danger"
                  ? "border-l-4 border-l-red-500"
                  : toast.variant === "warning"
                  ? "border-l-4 border-l-amber-500"
                  : "border-l-4 border-l-blue-600"
              }`}
            >
              <div className="shrink-0">
                {toast.variant === "danger" ? (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                ) : toast.variant === "warning" ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : toast.variant === "info" ? (
                  <Info className="w-4 h-4 text-blue-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <p className="text-xs font-semibold text-slate-800 flex-1">
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
