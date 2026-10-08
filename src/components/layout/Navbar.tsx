'use client';

import React, { useState } from 'react';
import {
  Gamepad2,
  FolderKanban,
  Video,
  FileBox,
  Users,
  LayoutDashboard,
  ShieldAlert,
  ChevronDown,
  Menu,
  X,
  Plus,
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

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: FolderKanban },
    { id: 'videos', label: 'Gameplay', icon: Video },
    { id: 'files', label: 'Files Vault', icon: FileBox },
    { id: 'members', label: 'Team', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1f2330] bg-[#0c0e15]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Project Name */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
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
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-900/20'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Role Switcher & Dev Tools */}
        <div className="flex items-center gap-3">
          {/* Quick role switcher for testing all 4 permissions */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${ROLE_BADGES[currentRole].color}`}
              title="Chuyển đổi vai trò để kiểm thử phân quyền 4 Roles"
            >
              <span>{ROLE_BADGES[currentRole].label}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-800 bg-[#12141c] p-1.5 shadow-xl shadow-black/60 z-50">
                <div className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 border-b border-zinc-800/80 mb-1">
                  Chuyển vai trò test (RBAC):
                </div>
                {(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as ProjectRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      onRoleChange(role);
                      setRoleDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      currentRole === role
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'text-zinc-300 hover:bg-zinc-800/60'
                    }`}
                  >
                    <span>{ROLE_BADGES[role].label}</span>
                    {currentRole === role && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden rounded-lg p-2 text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="border-b border-[#1f2330] bg-[#0e1017] px-4 pt-2 pb-4 md:hidden">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
