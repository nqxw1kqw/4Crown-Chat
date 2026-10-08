'use client';

import React, { useState } from 'react';
import { MessageSquare, Paperclip } from 'lucide-react';
import { PriorityBadge, TagBadge } from '@/components/common/badges';
import MemberAvatar from '@/components/common/member-avatar';
import { useLocale } from '@/i18n/useLocale';
import { TranslationKey } from '@/i18n/dictionaries/vi';
import type { TaskStatus } from '@/types/database';
import { STATUS_ORDER } from '../task-view-utils';
import type { TaskViewProps } from './task-table';
import { cn } from '@/lib/utils';

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  TODO: 'bg-[var(--color-border-strong)]',
  IN_PROGRESS: 'bg-[var(--color-brand)]',
  REVIEW: 'bg-[#F5A623]',
  DONE: 'bg-[var(--color-success)]',
  BLOCKED: 'bg-[var(--color-danger)]',
};

export default function TaskKanban({ tasks, members, canEditTask, onOpenTask, onStatusChange }: TaskViewProps) {
  const { t, formatDate, isOverdue } = useLocale();
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const memberOf = (userId: string | null) => members.find((m) => m.id === userId) ?? null;

  const handleDrop = (event: React.DragEvent, status: TaskStatus) => {
    event.preventDefault();
    setDragOver(null);
    setDragging(null);
    const taskId = event.dataTransfer.getData('text/plain');
    const target = tasks.find((task) => task.id === taskId);
    if (!target || target.status === status) return;
    onStatusChange(taskId, status, target.title);
  };

  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-2">
      {STATUS_ORDER.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);

        return (
          <section
            key={status}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver((current) => (current === status ? null : current))}
            onDrop={(event) => handleDrop(event, status)}
            className={cn(
              'flex w-[268px] shrink-0 snap-start flex-col rounded-lg border bg-[var(--color-surface)] transition-colors',
              dragOver === status ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : 'border-[var(--color-border)]'
            )}
          >
            <header className="flex items-center justify-between gap-2 rounded-t-lg border-b border-[var(--color-border)] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', COLUMN_ACCENT[status])} aria-hidden="true" />
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text)]">
                  {t(`status.${status}` as TranslationKey)}
                </h3>
              </div>
              <span className="rounded-full bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">
                {columnTasks.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {columnTasks.length === 0 && (
                <p className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-6 text-center text-[11px] text-[var(--color-text-muted)]">
                  {t('tasks.kanbanDropPlaceholder')}
                </p>
              )}

              {columnTasks.map((task) => {
                const assignee = memberOf(task.assignee_id);
                const creator = memberOf(task.creator_id);
                const overdue = task.status !== 'DONE' && isOverdue(task.deadline, task.status);

                return (
                  <article
                    key={task.id}
                    draggable={canEditTask(task)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', task.id);
                      event.dataTransfer.effectAllowed = 'move';
                      setDragging(task.id);
                    }}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => onOpenTask(task.id)}
                    className={cn(
                      'cursor-grab rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-xs transition-all hover:border-[var(--color-border-strong)] hover:shadow-sm active:cursor-grabbing',
                      !canEditTask(task) && 'cursor-default active:cursor-default',
                      dragging === task.id && 'opacity-40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <PriorityBadge priority={task.priority} withLabel={false} />
                      <div className="flex min-w-0 items-center gap-1.5">
                        <MemberAvatar slot={creator?.slot} name={creator?.display_name} size="xs" tooltip />
                        <TagBadge tag={task.tag} />
                      </div>
                    </div>

                    <h4 className="mt-2 line-clamp-2 text-[13px] leading-snug font-medium text-[var(--color-text)]">{task.title}</h4>

                    <div className="mt-2.5 flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
                      {!!task.comment_count && (
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="size-3" /> {task.comment_count}
                        </span>
                      )}
                      {!!task.attachment_count && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="size-3" /> {task.attachment_count}
                        </span>
                      )}
                      {!!task.checklist?.length && (
                        <span className="ml-auto font-mono text-[var(--color-brand)]">
                          {task.checklist.filter((item) => item.done).length}/{task.checklist.length}
                        </span>
                      )}
                    </div>

                    <footer className="mt-2.5 flex items-center justify-between border-t border-[var(--color-border)] pt-2.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <MemberAvatar slot={assignee?.slot} name={assignee?.display_name} size="xs" />
                        <span className="truncate text-[11px] text-[var(--color-text-muted)]">
                          {assignee?.display_name ?? t(task.assignee_id ? 'assignee.unknown' : 'assignee.unassigned')}
                        </span>
                      </div>
                      {task.deadline && (
                        <span className={cn('shrink-0 text-[11px]', overdue ? 'font-semibold text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]')}>
                          {formatDate(task.deadline)}
                        </span>
                      )}
                    </footer>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

