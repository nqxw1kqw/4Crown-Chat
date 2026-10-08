'use client';

import React, { useMemo } from 'react';
import { useLocale } from '@/i18n/useLocale';
import type { Task } from '@/types/database';
import { PriorityBadge, TagBadge } from '@/components/common/badges';
import MemberAvatar from '@/components/common/member-avatar';
import { addDays, dayDiff, startOfDay } from '../task-view-utils';
import { cn } from '@/lib/utils';

const BAR_COLOR: Record<Task['status'], string> = {
  TODO: 'bg-[var(--color-border-strong)]',
  IN_PROGRESS: 'bg-[var(--color-brand)]',
  REVIEW: 'bg-[#F5A623]',
  DONE: 'bg-[var(--color-success)]',
  BLOCKED: 'bg-[var(--color-danger)]',
};

const MIN_SPAN_DAYS = 28;
const MAX_SPAN_DAYS = 120;

export default function TaskTimeline({ tasks, members }: { tasks: Task[]; members: { id: string; slot: string; display_name: string }[] }) {
  const { t, locale, formatDate, isOverdue } = useLocale();
  const intlLocale = locale === 'ja' ? 'ja-JP' : 'vi-VN';

  const today = startOfDay(new Date());

  const { start, days, scheduled, unscheduled } = useMemo(() => {
    const withDeadline = tasks.filter((task) => task.deadline);
    const withoutDeadline = tasks.filter((task) => !task.deadline);
    if (withDeadline.length === 0) {
      return { start: addDays(today, -7), days: MIN_SPAN_DAYS, scheduled: [], unscheduled: tasks };
    }

    let first = today.getTime();
    let last = today.getTime();
    for (const task of withDeadline) {
      const deadline = startOfDay(task.deadline!).getTime();
      const created = startOfDay(task.created_at).getTime();
      first = Math.min(first, deadline, created);
      last = Math.max(last, deadline, today.getTime());
    }

    const windowStart = addDays(new Date(first), -3);
    const span = Math.min(MAX_SPAN_DAYS, Math.max(MIN_SPAN_DAYS, dayDiff(windowStart, new Date(last)) + 5));
    return {
      start: windowStart,
      days: span,
      scheduled: withDeadline,
      unscheduled: withoutDeadline,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const weekTicks = useMemo(() => {
    const ticks: { offset: number; label: string }[] = [];
    for (let index = 0; index < days; index += 7) {
      const date = addDays(start, index);
      ticks.push({
        offset: (index / days) * 100,
        label: new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: '2-digit' }).format(date),
      });
    }
    return ticks;
  }, [start, days, intlLocale]);

  const memberOf = (userId: string | null) => members.find((m) => m.id === userId) ?? null;

  const position = (task: Task) => {
    const deadline = startOfDay(task.deadline!).getTime();
    const created = startOfDay(task.created_at).getTime();
    const windowEnd = addDays(start, days).getTime();
    const from = Math.max(start.getTime(), Math.min(created, deadline));
    const to = Math.min(windowEnd, Math.max(deadline, from + 86_400_000));
    const left = ((from - start.getTime()) / (windowEnd - start.getTime())) * 100;
    const width = Math.max(1.5, ((to - from) / (windowEnd - start.getTime())) * 100);
    return { left: `${left}%`, width: `${width}%` };
  };

  if (tasks.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="min-w-[720px]">
        {/* Trục thời gian */}
        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="w-[260px] shrink-0 border-r border-[var(--color-border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {t('tasks.colTask')}
          </div>
          <div className="relative flex-1" style={{ height: 34 }}>
            {weekTicks.map((tick) => (
              <div key={tick.label} className="absolute top-0 h-full border-l border-[var(--color-border)] pl-1.5 pt-2 text-[10px] text-[var(--color-text-muted)]" style={{ left: `${tick.offset}%` }}>
                {tick.label}
              </div>
            ))}
            <div
              className="absolute top-0 h-full w-px bg-[var(--color-danger)]/60"
              style={{ left: `${(dayDiff(start, today) / days) * 100}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        {scheduled.map((task) => {
          const assignee = memberOf(task.assignee_id);
          const overdue = isOverdue(task.deadline, task.status);

          return (
            <div key={task.id} className="flex border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)]">
              <div className="flex w-[260px] shrink-0 items-center gap-2 border-r border-[var(--color-border)] px-3 py-2">
                <PriorityBadge priority={task.priority} withLabel={false} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--color-text)]">{task.title}</span>
                <TagBadge tag={task.tag} />
                <MemberAvatar slot={assignee?.slot} name={assignee?.display_name} size="xs" />
              </div>
              <div className="relative flex-1">
                {weekTicks.map((tick) => (
                  <div key={tick.label} className="absolute top-0 h-full border-l border-[var(--color-border)]/60" style={{ left: `${tick.offset}%` }} aria-hidden="true" />
                ))}
                <div
                  className={cn('absolute top-1/2 flex h-6 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-[10px] font-semibold text-white shadow-xs', BAR_COLOR[task.status])}
                  style={position(task)}
                  title={`${formatDate(task.created_at)} → ${formatDate(task.deadline)}`}
                >
                  <span className={cn('truncate', overdue && 'underline decoration-dotted')}>{task.progress}%</span>
                </div>
              </div>
            </div>
          );
        })}

        {unscheduled.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-[var(--color-surface)] px-3 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t('tasks.unscheduled')}</span>
            {unscheduled.map((task) => (
              <span key={task.id} className="inline-flex max-w-[220px] items-center gap-1.5 rounded-md border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 py-1 text-[11px] text-[var(--color-text-muted)]">
                <PriorityBadge priority={task.priority} withLabel={false} />
                <span className="truncate">{task.title}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
