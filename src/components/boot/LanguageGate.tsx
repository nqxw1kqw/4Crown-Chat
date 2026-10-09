'use client';

import React from 'react';
import ThemeToggle from '@/components/common/ThemeToggle';
import { Gamepad2, ArrowRight, Check } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { Locale } from '@/i18n/config';
import { Button } from '@/components/ui/Button';

interface LanguageGateProps {
  onContinue: () => void;
}

interface LanguageOption {
  id: Locale;
  nativeName: string;
  subName: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: 'vi',
    nativeName: 'Tiếng Việt',
    subName: 'Vietnamese',
  },
  {
    id: 'ja',
    nativeName: '日本語',
    subName: 'Japanese',
  },
];

export default function LanguageGate({ onContinue }: LanguageGateProps) {
  const { locale, setLocale, t } = useLocale();

  const handleSelectLanguage = (lang: Locale) => {
    setLocale(lang);
  };

  // Chọn "Tiếp tục" cũng là chốt ngôn ngữ, để lần tải trang sau khỏi hỏi lại.
  const handleContinue = () => {
    setLocale(locale);
    onContinue();
  };

  const handleKeyDown = (e: React.KeyboardEvent, lang: Locale) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleSelectLanguage(lang);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)] p-4 transition-opacity duration-200 sm:p-6"
      role="region"
      aria-label={t('boot.language.title')}
    >
      <div className="flex w-full max-w-lg animate-in fade-in zoom-in-95 flex-col items-center gap-8 text-center duration-200">
        <div className="self-end"><ThemeToggle /></div>
        {/* Brand logo & header */}
        <div className="space-y-3">
          <div
            className="inline-flex size-14 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white"
            aria-hidden="true"
          >
            <Gamepad2 className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
              {t('nav.brand')}
            </h1>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              {t('boot.language.subtitle')}
            </p>
          </div>
        </div>

        {/* Language selection radiogroup */}
        <div className="w-full" role="radiogroup" aria-label={t('boot.language.title')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LANGUAGE_OPTIONS.map((item) => {
              const isSelected = locale === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => handleSelectLanguage(item.id)}
                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                  className={`group flex min-h-14 cursor-pointer items-center justify-between rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-brand)]/50 ${
                    isSelected
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <span className="block text-sm font-semibold text-[var(--color-text)]">
                      {item.nativeName}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                      {item.subName}
                    </span>
                  </div>

                  <div
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isSelected
                        ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-white'
                        : 'border-[var(--color-border-strong)] text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    <Check className="size-3 stroke-[3]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action button */}
        <div className="w-full">
          <Button
            type="button"
            size="lg"
            onClick={handleContinue}
            className="w-full justify-center"
          >
            {t('boot.language.continue')}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
