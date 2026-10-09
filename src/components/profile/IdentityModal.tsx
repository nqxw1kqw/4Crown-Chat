'use client';

import React, { useState } from 'react';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { DEFAULT_SLOT_NAMES, SLOT_IDS, type SlotId } from '@/lib/constants';
import { useAppData } from '@/components/providers/AppDataProvider';
import { ApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import MemberAvatar from '@/components/common/member-avatar';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export default function IdentityModal() {
  const { locale, setLocale, t } = useLocale();
  const { login } = useAppData();

  const [selectedSlot, setSelectedSlot] = useState<SlotId>('m1');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await login(selectedSlot);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 429) {
        setErrorMessage(t('identity.errorRateLimited'));
      } else {
        setErrorMessage(t('boot.errorGeneric'));
      }
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-[#091E42]/50 p-4 backdrop-blur-md fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-modal-title"
    >
      <div className="relative flex w-full max-w-xl flex-col gap-6 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-xl sm:p-8">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <ThemeToggle />
          <div
            className="flex items-center gap-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 text-xs"
            role="group"
            aria-label={t('nav.languageSwitch')}
          >
            {(['vi', 'ja'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLocale(lang)}
                className={`cursor-pointer rounded px-2.5 py-1 font-medium transition-colors ${
                  locale === lang
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
                aria-pressed={locale === lang}
                title={lang === 'vi' ? 'Tiếng Việt' : '日本語'}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 pt-2 text-center sm:pt-0">
          <MemberAvatar slot={selectedSlot} name={DEFAULT_SLOT_NAMES[selectedSlot]} size="lg" />
          <h2
            id="identity-modal-title"
            className="text-lg font-semibold tracking-tight text-[var(--color-text)] sm:text-xl"
          >
            {t('identity.pickTitle')}
          </h2>
          <p className="max-w-md text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            {t('identity.pickDescription')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {t('profile.currentSlot')}
            </span>
            <div className="grid grid-cols-2 gap-3">
              {SLOT_IDS.map((slotId) => {
                const isSelected = selectedSlot === slotId;
                return (
                  <button
                    key={slotId}
                    type="button"
                    onClick={() => setSelectedSlot(slotId)}
                    aria-pressed={isSelected}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-brand)]/50 ${
                      isSelected
                        ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                        : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <MemberAvatar slot={slotId} name={DEFAULT_SLOT_NAMES[slotId]} size="sm" />
                      <div className="min-w-0">
                        <span className="mb-0.5 block font-mono text-[10px] font-semibold text-[var(--color-brand)]">
                          {t('profile.slotLabel', { slot: slotId.toUpperCase() })}
                        </span>
                        <span className="block truncate text-[13px] font-semibold text-[var(--color-text)]">
                          {DEFAULT_SLOT_NAMES[slotId]}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isSelected
                          ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-white'
                          : 'border-[var(--color-border-strong)] text-transparent'
                      }`}
                      aria-hidden="true"
                    >
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-md border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] px-3 py-2 text-xs font-medium text-[var(--color-danger)]"
            >
              {errorMessage}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full justify-center"
            disabled={submitting || !selectedSlot}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            {submitting ? t('identity.loggingIn') : t('identity.start')}
          </Button>
        </form>
      </div>
    </div>
  );
}
