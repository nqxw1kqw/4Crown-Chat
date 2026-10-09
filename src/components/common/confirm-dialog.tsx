'use client';

import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/i18n/useLocale';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  targetName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  busy?: boolean;
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
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLocale();
  const finalConfirmLabel =
    confirmLabel || (isDangerous ? t('confirm.defaultDangerousConfirm') : t('common.confirm'));
  const finalCancelLabel = cancelLabel || t('common.cancel');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
        <DialogHeader className="gap-3 p-5 pb-0 text-left">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                isDangerous
                  ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                  : 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
              }`}
            >
              {isDangerous ? <Trash2 className="size-5" /> : <AlertTriangle className="size-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm leading-tight font-semibold">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed">{description}</DialogDescription>
              {targetName && (
                <div className="mt-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 font-mono text-xs break-all">
                  {targetName}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-5 gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            {finalCancelLabel}
          </Button>
          <Button
            disabled={busy}
            type="button"
            size="sm"
            variant={isDangerous ? 'destructive' : 'default'}
            onClick={onConfirm}
            autoFocus
          >
            {finalConfirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
