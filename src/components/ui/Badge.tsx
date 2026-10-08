'use client';

import React from 'react';
import { ProjectRole, TaskPriority, TaskStatus } from '@/types/database';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/lib/constants';

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = TASK_STATUS_CONFIG[status] || { label: status, color: 'text-zinc-400 bg-zinc-800 border-zinc-700' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${config.color} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {config.label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  const config = TASK_PRIORITY_CONFIG[priority] || { label: priority, color: 'text-zinc-400' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${config.color} ${className}`}>
      ● {config.label}
    </span>
  );
}

interface RoleBadgeProps {
  role: ProjectRole;
  className?: string;
}

const ROLE_STYLES: Record<ProjectRole, { label: string; style: string }> = {
  OWNER: { label: 'Chủ dự án (OWNER)', style: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  ADMIN: { label: 'Quản trị (ADMIN)', style: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  MEMBER: { label: 'Thành viên (MEMBER)', style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  VIEWER: { label: 'Khách xem (VIEWER)', style: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
};

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const meta = ROLE_STYLES[role] || { label: role, style: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${meta.style} ${className}`}
    >
      {meta.label}
    </span>
  );
}
