'use client';

import React from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Check, Clock, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { TASK_STATUS_CONFIG, TASK_TAG_COLORS, type TaskTag } from '@/lib/constants';
import { useLocale } from '@/i18n/useLocale';
import type { TranslationKey } from '@/i18n/dictionaries/vi';
import type { ProjectRole, TaskPriority, TaskStatus } from '@/types/database';
import { cn } from '@/lib/utils';

const STATUS_DOT: Record<TaskStatus, string> = {
  TODO: 'bg-[var(--color-border-strong)]',
  IN_PROGRESS: 'bg-[var(--color-brand)]',
  REVIEW: 'bg-[#F5A623]',
  DONE: 'bg-[var(--color-success)]',
  BLOCKED: 'bg-[var(--color-danger)]',
};

export function StatusBadge({
  status,
  className,
  compact = false,
}: {
  status: TaskStatus;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const label = t(`status.${status}` as TranslationKey);

  if (compact) {
    return (
      <span
        className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text)]', className)}
        title={label}
      >
        <span className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[status])} aria-hidden="true" />
        {label}
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn('border-transparent px-2 py-0.5 text-[11px] font-medium', TASK_STATUS_CONFIG[status]?.color, className)}
    >
      <span className={cn('size-1.5 rounded-full', STATUS_DOT[status])} aria-hidden="true" />
      {label}
    </Badge>
  );
}

const PRIORITY_META: Record<TaskPriority, { icon: typeof ArrowUp; className: string }> = {
  LOW: { icon: ArrowDown, className: 'text-[var(--color-text-muted)]' },
  NORMAL: { icon: Minus, className: 'text-[var(--color-text-muted)]' },
  HIGH: { icon: ArrowUp, className: 'text-[var(--color-warning)]' },
  CRITICAL: { icon: AlertCircle, className: 'text-[var(--color-danger)]' },
};

export function PriorityBadge({
  priority,
  className,
  withLabel = true,
}: {
  priority: TaskPriority;
  className?: string;
  withLabel?: boolean;
}) {
  const { t } = useLocale();
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.NORMAL;
  const label = t(`priority.${priority}` as TranslationKey);
  const Icon = meta.icon;

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium', meta.className, className)}
      title={label}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      {withLabel && label}
    </span>
  );
}

export function TagBadge({ tag, className }: { tag: TaskTag | null | undefined; className?: string }) {
  const { t } = useLocale();
  if (!tag) return null;

  return (
    <Badge variant="outline" className={cn('border-transparent px-1.5 py-0 text-[10px] font-semibold uppercase', TASK_TAG_COLORS[tag], className)}>
      {t(`tag.${tag}` as TranslationKey)}
    </Badge>
  );
}

export function RoleBadge({ role, className }: { role: ProjectRole; className?: string }) {
  const { t } = useLocale();
  return (
    <Badge variant="secondary" className={cn('px-1.5 py-0 text-[10px] font-semibold', className)}>
      {t(`role.${role}` as TranslationKey)}
    </Badge>
  );
}

export function DoneBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-success-text)]">
      <Check className="size-3" /> {children}
    </span>
  );
}

export function ClockBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-muted)]">
      <Clock className="size-3" /> {children}
    </span>
  );
}
