'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLocale } from '@/i18n/useLocale';

import type { Task, TaskStatus } from '@/types/database';
import { addDays, startOfDay } from '../task-view-utils';
import { cn } from '@/lib/utils';

const DAY_COLOR: Record<TaskStatus, string> = {
  TODO: 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]',
  IN_PROGRESS: 'bg-[var(--color-brand-soft)] text-[var(--color-brand-hover)]',
  REVIEW: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  DONE: 'bg-[var(--color-success-soft)] text-[var(--color-success-text)]',
  BLOCKED: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
};

const CELL_TASK_LIMIT = 3;

export default function TaskCalendar({ tasks, onOpenTask }: { tasks: Task[]; onOpenTask: (taskId: string) => void }) {
  const { t, locale } = useLocale();
  const intlLocale = locale === 'ja' ? 'ja-JP' : 'vi-VN';
  // Lịch Nhật bắt đầu Chủ nhật, lịch Việt bắt đầu Thứ hai.
  const weekStartsOnSunday = locale === 'ja';
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  const today = startOfDay(new Date());

  const { cells, monthLabel } = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const weekdayIndex = (first.getDay() + 7 - (weekStartsOnSunday ? 0 : 1)) % 7;
    const gridStart = addDays(first, -weekdayIndex);

    const byDay = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.deadline) continue;
      const key = startOfDay(task.deadline).toISOString().slice(0, 10);
      const bucket = byDay.get(key);
      if (bucket) bucket.push(task);
      else byDay.set(key, [task]);
    }

    const cells = Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      const key = startOfDay(date).toISOString().slice(0, 10);
      return {
        date,
        inMonth: date.getMonth() === cursor.getMonth(),
        isToday: key === startOfDay(today).toISOString().slice(0, 10),
        items: byDay.get(key) ?? [],
      };
    });

    return {
      cells,
      monthLabel: new Intl.DateTimeFormat(intlLocale, { month: 'long', year: 'numeric' }).format(cursor),
    };
  }, [tasks, cursor, intlLocale, weekStartsOnSunday, today]);

  const weekdayLabels = useMemo(() => {
    // 2024-01-07 là Chủ nhật; quay vòng 7 ngày từ mốc đó theo tuần bắt đầu.
    const base = new Date(2024, 0, weekStartsOnSunday ? 7 : 8);
    return Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(intlLocale, { weekday: 'short' }).format(addDays(base, index))
    );
  }, [intlLocale, weekStartsOnSunday]);

  const shiftMonth = (months: number) => {
    setCursor((current) => startOfDay(new Date(current.getFullYear(), current.getMonth() + months, 1)));
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2.5">
        <h3 className="text-[13px] font-semibold text-[var(--color-text)] first-letter:uppercase">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="xs" onClick={() => setCursor(startOfDay(new Date()))}>
            {t('common.today')}
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" onClick={() => shiftMonth(-1)} aria-label={t('tasks.prevMonth')}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" onClick={() => shiftMonth(1)} aria-label={t('tasks.nextMonth')}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        {weekdayLabels.map((label) => (
          <div key={label} className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell) => (
          <div
            key={cell.date.toISOString()}
            className={cn(
              'min-h-[70px] border-r border-b border-[var(--color-border)] p-1.5 last:border-r-0 sm:min-h-[92px]',
              !cell.inMonth && 'bg-[var(--color-surface)]/60',
              cell.isToday && 'bg-[var(--color-brand-soft)]'
            )}
          >
            <div className={cn('mb-1 text-right text-[11px] font-semibold', cell.inMonth ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]')}>
              {cell.date.getDate()}
            </div>
            <div className="space-y-1">
              {cell.items.slice(0, CELL_TASK_LIMIT).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onOpenTask(task.id)}
                  title={task.title}
                  className={cn(
                    'flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80',
                    DAY_COLOR[task.status]
                  )}
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-current sm:hidden" aria-hidden="true" />
                  <span className="hidden truncate sm:block">{task.title}</span>
                </button>
              ))}
              {cell.items.length > CELL_TASK_LIMIT && (
                <p className="px-1.5 text-[10px] text-[var(--color-text-muted)]">
                  {t('tasks.moreCount', { count: cell.items.length - CELL_TASK_LIMIT })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
