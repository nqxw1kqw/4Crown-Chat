'use client';

import Link from 'next/link';
import { Link2 } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { StatusBadge } from '@/components/common/badges';
import type { Task } from '@/types/database';
import { cn } from '@/lib/utils';

/**
 * Hiện công việc mà một file/video đang gắn vào.
 * Luôn render (kể cả khi chưa gắn) để người đọc thấy rõ trạng thái liên kết.
 */
export default function LinkedTaskChip({ task, className }: { task: Task | undefined; className?: string }) {
  const { t } = useLocale();

  if (!task) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--color-border-strong)] px-2 py-0.5 text-[11px] text-[var(--color-text-muted)]',
          className
        )}
      >
        <Link2 className="size-3 shrink-0" aria-hidden="true" />
        {t('common.noLinkedTask')}
      </span>
    );
  }

  return (
    <Link
      href={`/tasks/${task.id}`}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-0.5 text-[11px] transition-colors hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-brand-soft)]',
        className
      )}
    >
      <Link2 className="size-3 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
      <span className="shrink-0 font-semibold text-[var(--color-text-muted)]">{t('common.linkedTask')}</span>
      <span className="truncate font-medium text-[var(--color-text)]">{task.title}</span>
      <StatusBadge status={task.status} compact className="shrink-0 text-[10px]" />
    </Link>
  );
}
