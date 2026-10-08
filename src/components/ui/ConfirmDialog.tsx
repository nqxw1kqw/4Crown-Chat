'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  targetName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  targetName,
  confirmLabel = 'Xóa vĩnh viễn',
  cancelLabel = 'Hủy bỏ',
  isDangerous = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      // Focus vào nút xác nhận khi mở
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);

      // Bắt phím Esc để đóng dialog
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
        }
        // Focus trap đơn giản
        if (e.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              last.focus();
              e.preventDefault();
            } else if (!e.shiftKey && document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        // Trả focus về phần tử kích hoạt trước đó
        previousActiveElementRef.current?.focus();
      };
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#12141e] p-6 shadow-2xl focus:outline-none"
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isDangerous
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isDangerous ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-sm font-bold text-white">
              {title}
            </h3>
            <p id="confirm-dialog-desc" className="text-xs text-zinc-400 mt-1 leading-relaxed">
              {description}
            </p>
            {targetName && (
              <div className="mt-2.5 p-2 rounded-lg border border-zinc-800 bg-[#171924] text-xs font-mono text-zinc-300 break-all">
                {targetName}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-500 hover:text-white p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
            aria-label="Đóng hộp thoại"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-zinc-700/60 bg-zinc-800/80 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
