'use client';

import React from 'react';
import { ProjectRole, TaskPriority, TaskStatus } from '@/types/database';
import { useLocale } from '@/i18n/useLocale';
import { TranslationKey } from '@/i18n/dictionaries/vi';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border)]',
    success: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/30',
    warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/30',
    danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/30',
    info: 'bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/30',
    accent: 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/30',
    outline: 'bg-transparent text-[var(--color-text)] border-[var(--color-border-strong)]',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 rounded-md font-medium',
    md: 'text-[11px] px-2.5 py-0.5 rounded-lg font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 border ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const STATUS_COLOR_CONFIG: Record<TaskStatus, string> = {
  TODO: 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border-strong)]',
  IN_PROGRESS: 'bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/30',
  REVIEW: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/30',
  DONE: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/30',
  BLOCKED: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/30',
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { t } = useLocale();
  const colorClass =
    STATUS_COLOR_CONFIG[status] ||
    'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border)]';
  const label = t(`status.${status}` as TranslationKey);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${colorClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

const PRIORITY_COLOR_CONFIG: Record<TaskPriority, string> = {
  LOW: 'text-[var(--color-text-muted)]',
  NORMAL: 'text-[var(--color-info)]',
  HIGH: 'text-[var(--color-warning)]',
  CRITICAL: 'text-[var(--color-danger)] font-bold',
};

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  const { t } = useLocale();
  const colorClass = PRIORITY_COLOR_CONFIG[priority] || 'text-[var(--color-text-muted)]';
  const label = t(`priority.${priority}` as TranslationKey);

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${colorClass} ${className}`}>
      ● {label}
    </span>
  );
}

interface RoleBadgeProps {
  role: ProjectRole;
  className?: string;
}

const ROLE_STYLES: Record<ProjectRole, string> = {
  OWNER: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/30',
  ADMIN: 'bg-[var(--color-accent)]/15 text-indigo-300 border-[var(--color-accent)]/30',
  MEMBER: 'bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30',
  VIEWER: 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border)]',
};

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const { t } = useLocale();
  const style = ROLE_STYLES[role] || 'bg-[var(--color-surface-raised)] text-[var(--color-text)] border-[var(--color-border)]';
  const label = t(`role.${role}` as TranslationKey);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${style} ${className}`}
    >
      {label}
    </span>
  );
}
