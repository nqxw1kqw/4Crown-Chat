'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  ChevronDown,
  FileBox,
  FolderKanban,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  User,
  Video,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import MemberAvatar, { MemberAvatarStack } from '@/components/common/member-avatar';
import { RoleBadge } from '@/components/common/badges';
import { useLocale } from '@/i18n/useLocale';
import { useAppData } from '@/components/providers/AppDataProvider';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/tasks', labelKey: 'nav.tasks', icon: FolderKanban },
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/videos', labelKey: 'nav.videos', icon: Video },
  { href: '/files', labelKey: 'nav.files', icon: FileBox },
] as const;

interface NavbarProps {
  onOpenProfile: () => void;
}

export default function Navbar({ onOpenProfile }: NavbarProps) {
  const { locale, setLocale, t } = useLocale();
  const { project, session, members, logout } = useAppData();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const me = members.find((m) => m.slot === session?.slot);
  const myName = me?.display_name ?? session?.slot.toUpperCase() ?? '';
  const role = session?.role ?? 'VIEWER';

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Nút "Tạo task" luôn đưa về tab Công việc và bật modal tạo qua query param.
  const openCreateTask = () => router.push('/tasks?new=1');

  const handleSignOut = async () => {
    await logout();
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8 2xl:px-12">
          {/* Brand + project */}
          <Link href="/tasks" className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]">
            <span
              className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white shadow-sm"
              aria-hidden="true"
            >
              <Gamepad2 className="size-[18px]" />
            </span>
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span className="truncate text-[13px] font-bold tracking-tight whitespace-nowrap text-[var(--color-text)]">{t('nav.brand')}</span>
              <span className="max-w-[220px] truncate text-[11px] text-[var(--color-text-muted)]">
                {project?.name ?? t('common.loading')}
              </span>
            </span>
          </Link>

          <div className="hidden lg:block">
            <Separator orientation="vertical" className="h-6!" />
          </div>

          {/* Primary nav */}
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label={t('nav.mainNavigation')}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                    active
                      ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-hover)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            <Button size="sm" onClick={openCreateTask} className="hidden sm:inline-flex">
              <Plus className="size-4" />
              {t('tasks.createTaskShort')}
            </Button>

            {/* Team presence */}
            {members.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden items-center md:flex">
                    <MemberAvatarStack members={members} size="sm" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {t('nav.teamTooltip', { count: members.length })}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Language */}
            <div
              className="flex h-8 items-center rounded-md border border-[var(--color-border-strong)] p-0.5"
              role="group"
              aria-label={t('nav.languageSwitch')}
            >
              {(['vi', 'ja'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocale(code)}
                  aria-pressed={locale === code}
                  className={cn(
                    'h-full cursor-pointer rounded px-2 text-[11px] font-semibold transition-colors',
                    locale === code
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  )}
                >
                  {code === 'vi' ? 'VI' : '日本語'}
                </button>
              ))}
            </div>

            {/* Account */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] pr-1.5 pl-1 transition-colors hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
                  aria-label={t('profile.myProfile')}
                >
                  <MemberAvatar slot={session?.slot} name={myName} size="sm" />
                  <span className="hidden max-w-[110px] truncate text-xs font-semibold sm:block">{myName}</span>
                  <ChevronDown className="size-3.5 text-[var(--color-text-muted)]" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex items-center gap-2.5 font-normal">
                  <MemberAvatar slot={session?.slot} name={myName} size="lg" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{myName}</span>
                    <RoleBadge role={role} className="mt-1" />
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onOpenProfile}>
                  <User className="size-4" />
                  {t('profile.myProfile')}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
                  <LogOut className="size-4" />
                  {t('nav.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileMenuOpen && (
          <nav
            className="grid grid-cols-2 gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 lg:hidden"
            aria-label={t('nav.mobileNavigation')}
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2.5 text-[13px] font-medium',
                    active
                      ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-hover)]'
                      : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
            <Button size="sm" className="col-span-2 sm:hidden" onClick={openCreateTask}>
              <Plus className="size-4" />
              {t('tasks.createTask')}
            </Button>
          </nav>
        )}
      </header>

      {/* Bottom tab bar cho mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 px-2 py-1 backdrop-blur-md md:hidden"
        style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label={t('nav.mobileNavigation')}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 transition-colors',
                active ? 'font-semibold text-[var(--color-brand)]' : 'text-[var(--color-text-muted)]'
              )}
              aria-label={t(item.labelKey)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="max-w-[64px] truncate text-[10px] leading-tight">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

