'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, House } from 'lucide-react';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { useLocale } from '@/i18n/useLocale';
import { Button } from '@/components/ui/Button';

function NotFoundContent() {
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[var(--color-bg)] p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-brand)]">
        <Compass className="size-7" />
      </div>

      <div className="space-y-1.5">
        <p className="text-4xl font-bold tracking-tight text-[var(--color-text-muted)]">404</p>
        <h1 className="text-base font-semibold text-[var(--color-text)]">{t('notFound.title')}</h1>
        <p className="max-w-sm text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          {t('notFound.description')}
        </p>
      </div>

      <Button asChild>
        <Link href="/tasks">
          <House className="size-4" />
          {t('notFound.backHome')}
        </Link>
      </Button>
    </div>
  );
}

export default function NotFound() {
  return (
    <LocaleProvider>
      <NotFoundContent />
    </LocaleProvider>
  );
}
