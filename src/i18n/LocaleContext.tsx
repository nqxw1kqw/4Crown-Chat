'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Locale, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, LOCALE_COOKIE_KEY, LOCALES } from './config';
import { vi, TranslationKey } from './dictionaries/vi';
import { ja } from './dictionaries/ja';
import {
  formatDate as formatWithLocale,
  formatNumber as formatNumberWithLocale,
  formatBytes as formatBytesWithLocale,
  formatDuration as formatDurationWithLocale,
  isOverdue as isOverdueWithLocale,
} from './format';

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = {
  vi,
  ja,
};

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  formatDate: (dateString?: string | null, referenceTime?: number) => string;
  formatNumber: (value: number) => string;
  formatBytes: (bytes: number, decimals?: number) => string;
  formatDuration: (seconds: number) => string;
  isOverdue: (dateString?: string | null, statusOrRefTime?: string | number, referenceTime?: number) => boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Client-only: người dùng đã từng chọn ngôn ngữ trên máy này chưa. */
export function hasStoredLocale(): boolean {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    return !!saved && (LOCALES as readonly string[]).includes(saved);
  } catch {
    return false;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Khởi tạo locale từ localStorage hoặc cookie trên client
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
      if (saved && (LOCALES as readonly string[]).includes(saved)) {
        setTimeout(() => {
          setLocaleState(saved);
        }, 0);
        document.documentElement.lang = saved;
      } else {
        document.documentElement.lang = DEFAULT_LOCALE;
      }
    } catch {
      // Bỏ qua lỗi truy cập storage nếu có
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (!(LOCALES as readonly string[]).includes(next)) return;
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      document.cookie = `${LOCALE_COOKIE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = next;
    } catch {
      // Bỏ qua nếu môi trường chặn cookie/storage
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE];
      let text = dict[key] || DICTIONARIES[DEFAULT_LOCALE][key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
        });
      }

      return text;
    },
    [locale]
  );

  const formatDate = useCallback(
    (dateString?: string | null, referenceTime?: number) =>
      formatWithLocale(dateString, locale, referenceTime),
    [locale]
  );

  const formatNumber = useCallback(
    (val: number) => formatNumberWithLocale(val, locale),
    [locale]
  );

  const formatBytes = useCallback(
    (bytes: number, decimals?: number) => formatBytesWithLocale(bytes, locale, decimals),
    [locale]
  );

  const formatDuration = useCallback(
    (seconds: number) => formatDurationWithLocale(seconds),
    []
  );

  const isOverdue = useCallback(
    (dateString?: string | null, statusOrRefTime?: string | number, referenceTime?: number) =>
      isOverdueWithLocale(dateString, statusOrRefTime, referenceTime),
    []
  );

  const contextValue = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatDate,
      formatNumber,
      formatBytes,
      formatDuration,
      isOverdue,
    }),
    [locale, setLocale, t, formatDate, formatNumber, formatBytes, formatDuration, isOverdue]
  );

  return <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
