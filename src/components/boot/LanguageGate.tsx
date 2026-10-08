'use client';

import React from 'react';
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

  const handleKeyDown = (e: React.KeyboardEvent, lang: Locale) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleSelectLanguage(lang);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[var(--color-bg)] transition-opacity duration-200"
      role="region"
      aria-label={t('boot.language.title')}
    >
      <div className="w-full max-w-lg flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Logo & Header */}
        <div className="space-y-3">
          <div
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xl shadow-indigo-500/25"
            aria-hidden="true"
          >
            <Gamepad2 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
              {t('nav.brand')}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
              {t('boot.language.subtitle')}
            </p>
          </div>
        </div>

        {/* Language Selection Radiogroup */}
        <div
          className="w-full space-y-3"
          role="radiogroup"
          aria-label={t('boot.language.title')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                  className={`group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl border text-left transition-all duration-150 min-h-[56px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    isSelected
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 shadow-lg shadow-indigo-950/20 ring-1 ring-[var(--color-accent)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <span className="block text-base sm:text-lg font-bold text-[var(--color-text)] group-hover:text-indigo-300 transition-colors">
                      {item.nativeName}
                    </span>
                    <span className="block text-xs text-[var(--color-text-muted)] mt-0.5 font-medium">
                      {item.subName}
                    </span>
                  </div>

                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-sm'
                        : 'border-[var(--color-border-strong)] bg-transparent text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    <Check className={`h-3.5 w-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full pt-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onContinue}
            className="w-full justify-center text-sm sm:text-base font-bold py-3.5 sm:py-4 shadow-lg shadow-indigo-600/20 min-h-[48px]"
            icon={ArrowRight}
          >
            {t('boot.language.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
