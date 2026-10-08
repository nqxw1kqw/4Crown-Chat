'use client';

import React, { useState } from 'react';
import {
  Gamepad2,
  FolderKanban,
  Video,
  FileBox,
  Users,
  LayoutDashboard,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { ProjectRole } from '@/types/database';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentRole: ProjectRole;
  onRoleChange: (role: ProjectRole) => void;
  projectName: string;
}

const ROLE_BADGES: Record<ProjectRole, { label: string; color: string }> = {
  OWNER: { label: 'OWNER (Chủ phòng)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  ADMIN: { label: 'ADMIN (Quản trị)', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
  MEMBER: { label: 'MEMBER (Thành viên)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  VIEWER: { label: 'VIEWER (Chỉ xem)', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-700/50' },
};

export default function Navbar({
  currentTab,
  onTabChange,
  currentRole,
  onRoleChange,
  projectName,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // Chỉ hiển thị Role Switcher khi dev hoặc khi bật cờ NEXT_PUBLIC_SHOW_ROLE_SWITCHER
  const showRoleSwitcher =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_SHOW_ROLE_SWITCHER === 'true';

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: FolderKanban },
    { id: 'videos', label: 'Gameplay', icon: Video },
    { id: 'files', label: 'Files Vault', icon: FileBox },
    { id: 'members', label: 'Team', icon: Users },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#1f2330] bg-[#0c0e15]/90 backdrop-blur-md">
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
                <span className="text-base font-bold text-white tracking-tight">Game Team Hub</span>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                  v0.1
                </span>
              </div>
              <div className="text-xs text-zinc-400 flex items-center gap-1">
                <span className="font-medium text-zinc-300 truncate max-w-[140px] sm:max-w-[200px]">
                  {projectName}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Điều hướng chính">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-900/20'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Role Display / Switcher */}
          <div className="flex items-center gap-3">
            {showRoleSwitcher ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[36px] ${ROLE_BADGES[currentRole].color}`}
                  title="Chuyển đổi vai trò để kiểm thử phân quyền 4 Roles"
                  aria-haspopup="listbox"
                  aria-expanded={roleDropdownOpen}
                  aria-label={`Vai trò hiện tại: ${ROLE_BADGES[currentRole].label}. Bấm để đổi vai trò kiểm thử`}
                >
                  <span>{ROLE_BADGES[currentRole].label}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                </button>

                {roleDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-800 bg-[#12141c] p-1.5 shadow-xl shadow-black/60 z-50 animate-in fade-in zoom-in-95 duration-100"
                    role="listbox"
                    aria-label="Danh sách vai trò kiểm thử"
                  >
                    <div className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 border-b border-zinc-800/80 mb-1">
                      Chuyển vai trò test (RBAC):
                    </div>
                    {(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as ProjectRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          onRoleChange(role);
                          setRoleDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[36px] ${
                          currentRole === role
                            ? 'bg-indigo-600/20 text-indigo-300'
                            : 'text-zinc-300 hover:bg-zinc-800/60'
                        }`}
                        role="option"
                        aria-selected={currentRole === role}
                      >
                        <span>{ROLE_BADGES[role].label}</span>
                        {currentRole === role && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Ở production: Chỉ hiển thị huy hiệu vai trò tĩnh */
              <span
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${ROLE_BADGES[currentRole].color}`}
                aria-label={`Vai trò của bạn: ${ROLE_BADGES[currentRole].label}`}
              >
                {ROLE_BADGES[currentRole].label}
              </span>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden rounded-lg p-2 text-zinc-400 hover:bg-zinc-800/60 hover:text-white min-h-[44px] min-w-[44px] items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-[#1f2330] bg-[#0e1017] px-4 pt-2 pb-4 md:hidden animate-in slide-in-from-top-2">
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
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Fixed Bottom Navigation (Tap Target >= 44x44px, safe-area-inset-bottom) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e15]/95 border-t border-[#1f2330] backdrop-blur-md px-2 py-1 flex items-center justify-around shadow-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
        aria-label="Điều hướng nhanh di động"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl min-h-[48px] min-w-[48px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
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
