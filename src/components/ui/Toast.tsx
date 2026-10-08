'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message }: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${crypto.randomUUID()}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);

      // Tự động tắt sau 4 giây
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => showToast({ type: 'success', title, message }), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast({ type: 'error', title, message }), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast({ type: 'warning', title, message }), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast({ type: 'info', title, message }), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Container Toast: góc trên bên phải trên desktop, giữa phía trên trên mobile */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-2 ${
                isSuccess
                  ? 'bg-[#101f19]/90 border-emerald-500/40 text-emerald-200'
                  : isError
                  ? 'bg-[#221316]/90 border-rose-500/40 text-rose-200'
                  : isWarning
                  ? 'bg-[#211a12]/90 border-amber-500/40 text-amber-200'
                  : 'bg-[#141724]/90 border-indigo-500/40 text-indigo-200'
              }`}
              role="alert"
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                {isError && <AlertCircle className="h-4 w-4 text-rose-400" />}
                {isWarning && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="h-4 w-4 text-indigo-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight text-white">{toast.title}</p>
                {toast.message && <p className="text-[11px] opacity-80 mt-0.5">{toast.message}</p>}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
                aria-label="Đóng thông báo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast phải được dùng bên trong ToastProvider');
  }
  return context;
}
