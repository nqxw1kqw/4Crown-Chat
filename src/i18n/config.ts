export const LOCALES = ['vi', 'ja'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'vi';
export const LOCALE_STORAGE_KEY = 'gth.locale';
export const LOCALE_COOKIE_KEY = 'NEXT_LOCALE';

export const LOCALE_LABELS: Record<Locale, string> = {
  vi: 'Tiếng Việt',
  ja: '日本語',
};
