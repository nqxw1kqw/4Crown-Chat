'use client';

import React, { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  align?: 'start' | 'center' | 'end';
}

const subscribe = () => () => {};

export function ThemeToggle({ className, align = 'end' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useLocale();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          'flex size-8 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text-muted)] opacity-50',
          className
        )}
        aria-label="Theme toggle"
      >
        <Sun className="size-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]',
                className
              )}
              aria-label={t('theme.toggle')}
            >
              {isDark ? (
                <Moon className="size-4 text-[var(--color-brand)]" />
              ) : (
                <Sun className="size-4 text-[var(--color-warning)]" />
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t('theme.toggle')}</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align={align} className="w-36">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="flex cursor-pointer items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Sun className="size-4 text-[var(--color-warning)]" />
            <span>{t('theme.light')}</span>
          </span>
          {theme === 'light' && <Check className="size-3.5 text-[var(--color-brand)]" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="flex cursor-pointer items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Moon className="size-4 text-[var(--color-brand)]" />
            <span>{t('theme.dark')}</span>
          </span>
          {theme === 'dark' && <Check className="size-3.5 text-[var(--color-brand)]" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="flex cursor-pointer items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Monitor className="size-4 text-[var(--color-text-muted)]" />
            <span>{t('theme.system')}</span>
          </span>
          {theme === 'system' && <Check className="size-3.5 text-[var(--color-brand)]" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
