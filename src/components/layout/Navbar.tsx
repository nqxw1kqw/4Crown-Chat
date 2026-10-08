'use client';

import React, { useState } from 'react';
import {
  Gamepad2,
  FolderKanban,
  Video,
  FileBox,
  LayoutDashboard,
  User,
  Menu,
  X,
} from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { LocalProfileState, getSlotDisplayName } from '@/lib/profile';
import { ProjectRole } from '@/types/database';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  projectName: string;
  currentProfile: LocalProfileState;
  onOpenProfile: () => void;
}

const ROLE_COLOR_STYLES: Record<ProjectRole, string> = {
  OWNER: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/30',
  ADMIN: 'bg-[var(--color-accent)]/15 text-indigo-300 border-[var(--color-accent)]/30',
  MEMBER: 'bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30',
  VIEWER: 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border)]',
};

export default function Navbar({
  currentTab,
  onTabChange,
  projectName,
  currentProfile,
  onOpenProfile,
}: NavbarProps) {
  const { locale, setLocale, t } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 4 Tab chính (Bỏ hoàn toàn mục Team theo yêu cầu Vòng 3)
  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'tasks', label: t('nav.tasks'), icon: FolderKanban },
    { id: 'videos', label: t('nav.videos'), icon: Video },
    { id: 'files', label: t('nav.files'), icon: FileBox },
  ];

  const currentDisplayName = getSlotDisplayName(
    currentProfile.currentSlotId,
    currentProfile.names,
    t('assignee.unknown')
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand & Project Name */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/20 shrink-0"
              aria-hidden="true"
            >
              <Gamepad2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[var(--color-text)] tracking-tight">
                  {t('nav.brand')}
                </span>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                <span className="font-medium text-[var(--color-text)] truncate max-w-[140px] sm:max-w-[200px]">
                  {projectName}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation (4 Tab) */}
          <nav className="hidden md:flex items-center gap-1" aria-label={t('nav.mainNavigation')}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-accent)]/15 text-indigo-400 border border-[var(--color-accent)]/30 shadow-sm shadow-indigo-900/20'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] border border-transparent'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-[var(--color-text-muted)]'}`} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Language Switcher + My Profile Button + Mobile Menu Toggle */}
          <div className="flex items-center gap-2.5">
            {/* Language Switcher Segmented Control */}
            <div
              className="flex items-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-strong)] p-1 text-xs"
              role="group"
              aria-label={t('nav.languageSwitch')}
            >
              <button
                type="button"
                onClick={() => setLocale('vi')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                  locale === 'vi'
                    ? 'bg-[var(--color-accent)] text-white shadow-sm font-semibold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
                aria-pressed={locale === 'vi'}
                title="Tiếng Việt"
              >
                Tiếng Việt
              </button>
              <button
                type="button"
                onClick={() => setLocale('ja')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                  locale === 'ja'
                    ? 'bg-[var(--color-accent)] text-white shadow-sm font-semibold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
                aria-pressed={locale === 'ja'}
                title="日本語"
              >
                日本語
              </button>
            </div>

            {/* My Profile Button (Thay thế hoàn toàn Role Switcher) */}
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-surface-raised)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] min-h-[36px] cursor-pointer"
              title={t('profile.myProfile')}
              aria-label={t('profile.myProfile')}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-[var(--color-accent)]/20 text-indigo-400">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-[var(--color-text)] max-w-[100px] sm:max-w-[130px] truncate">
                {currentDisplayName}
              </span>
              <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${ROLE_COLOR_STYLES[currentProfile.role]}`}>
                {t(`role.${currentProfile.role}` as Parameters<typeof t>[0])}
              </span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] min-h-[44px] min-w-[44px] items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] cursor-pointer"
              aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Dropdown (4 Tab + Hồ sơ) */}
        {mobileMenuOpen && (
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 pt-2 pb-4 md:hidden animate-in slide-in-from-top-2">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] cursor-pointer ${
                      isActive
                        ? 'bg-[var(--color-accent)]/20 text-indigo-300 border border-[var(--color-accent)]/30 font-semibold'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenProfile();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium min-h-[48px] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] border border-[var(--color-border)] cursor-pointer mt-2"
              >
                <User className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                <span>{t('profile.myProfile')}</span>
                <span className={`ml-auto rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${ROLE_COLOR_STYLES[currentProfile.role]}`}>
                  {t(`role.${currentProfile.role}` as Parameters<typeof t>[0])}
                </span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Fixed Bottom Navigation (4 mục: Dashboard, Tasks, Videos, Files) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-bg)]/95 border-t border-[var(--color-border)] backdrop-blur-md px-2 py-1 flex items-center justify-around shadow-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
        aria-label={t('nav.mobileNavigation')}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl min-h-[48px] min-w-[48px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] cursor-pointer ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 mb-0.5" aria-hidden="true" />
              <span className="text-[10px] leading-tight truncate max-w-[64px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
