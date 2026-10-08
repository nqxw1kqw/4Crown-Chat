'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { TriangleAlert, RotateCw } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { Button } from '@/components/ui/Button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-md border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
        <TriangleAlert className="size-6" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-base font-semibold tracking-tight text-[var(--color-text)]">
          {t('error.title')}
        </h1>
        <p className="max-w-md text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          {t('error.description')}
        </p>
        <p className="font-mono text-[11px] text-[var(--color-text-muted)]">{pathname}</p>
      </div>

      <Button onClick={reset}>
        <RotateCw className="size-4" />
        {t('error.retry')}
      </Button>

      {error.digest && (
        <p className="font-mono text-[11px] text-[var(--color-text-muted)]">digest: {error.digest}</p>
      )}
    </div>
  );
}
