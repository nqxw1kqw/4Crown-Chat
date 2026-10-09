'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { useLocale } from '@/i18n/useLocale';
import { Button } from '@/components/ui/Button';

const subscribe = () => () => {};

export default function ThemeToggle() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const dark = resolvedTheme === 'dark';
  const label = t(dark ? 'theme.switchLight' : 'theme.switchDark');
  return (
    <Button type="button" variant="ghost" size="icon" disabled={!mounted} title={mounted ? label : t('theme.toggle')} aria-label={mounted ? label : t('theme.toggle')} onClick={() => setTheme(dark ? 'light' : 'dark')}>
      {mounted && dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
