'use client';

import React from 'react';
import { TriangleAlert, RotateCw } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useAppData } from '@/components/providers/AppDataProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function BootError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale();
  const { errorCode } = useAppData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)] p-4">
      <Card className="w-full max-w-md gap-4 border-[var(--color-border)] p-6 text-center shadow-sm">
        <div className="flex size-12 items-center justify-center self-center rounded-md border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
          <TriangleAlert className="size-6" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-base font-semibold tracking-tight text-[var(--color-text)]">
            {t('boot.errorTitle')}
          </h1>
          <p className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            {errorCode === 'unauthorized' || errorCode === 'forbidden'
              ? t('boot.errorForbidden')
              : errorCode === 'unconfigured'
                ? t('boot.errorUnconfigured')
                : t('boot.errorGeneric')}
          </p>
        </div>

        <Button className="self-center" onClick={onRetry}>
          <RotateCw className="size-4" />
          {t('boot.errorRetry')}
        </Button>
      </Card>
    </div>
  );
}
