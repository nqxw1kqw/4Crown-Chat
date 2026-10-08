'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';

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
  confirmLabel,
  cancelLabel,
  isDangerous = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const finalConfirmLabel =
    confirmLabel || (isDangerous ? t('confirm.defaultDangerousConfirm') : t('common.confirm'));
  const finalCancelLabel = cancelLabel || t('common.cancel');

  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
        }
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
        className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-2xl focus:outline-none"
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isDangerous
                ? 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/30'
                : 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30'
            }`}
          >
            {isDangerous ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-sm font-bold text-[var(--color-text)]">
              {title}
            </h3>
            <p id="confirm-dialog-desc" className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
              {description}
            </p>
            {targetName && (
              <div className="mt-2.5 p-2 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-xs font-mono text-[var(--color-text)] break-all">
                {targetName}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] transition-colors cursor-pointer"
            aria-label={t('confirm.closeAria')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] transition-colors cursor-pointer"
          >
            {finalCancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] transition-colors cursor-pointer ${
              isDangerous
                ? 'bg-[var(--color-danger)] hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-[var(--color-accent)] hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {finalConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
