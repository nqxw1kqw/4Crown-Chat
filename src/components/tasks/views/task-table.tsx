'use client';

import React from 'react';
import { Check, MessageSquare, Paperclip } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { PriorityBadge, StatusBadge, TagBadge } from '@/components/common/badges';
import MemberAvatar from '@/components/common/member-avatar';
import { useLocale } from '@/i18n/useLocale';
import type { Task, TaskStatus, TeamMember } from '@/types/database';
import { cn } from '@/lib/utils';

export interface TaskViewProps {
  tasks: Task[];
  members: TeamMember[];
  canEditTask: (task: { creator_id: string | null; assignee_id: string | null }) => boolean;
  onOpenTask: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus, title: string) => void;
}

export default function TaskTable({ tasks, members, canEditTask, onOpenTask, onStatusChange }: TaskViewProps) {
  const { t, formatDate, isOverdue } = useLocale();

  const memberOf = (userId: string | null) => members.find((m) => m.id === userId) ?? null;

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
      <Table className="min-w-0 md:min-w-[880px]">
        <TableHeader>
          <TableRow className="border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface)]">
            <TableHead className="w-10 px-3" />
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {t('tasks.colTask')}
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] md:w-[130px]">
              {t('tasks.colStatus')}
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] md:w-[160px]">
              {t('tasks.colAssignee')}
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] md:w-[130px]">
              {t('tasks.colDue')}
            </TableHead>
            <TableHead className="hidden w-[110px] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] md:table-cell">
              {t('tasks.colPriority')}
            </TableHead>
            <TableHead className="hidden w-[120px] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] md:table-cell">
              {t('tasks.colProgress')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const assignee = memberOf(task.assignee_id);
            const overdue = task.status !== 'DONE' && isOverdue(task.deadline, task.status);
            const doneCount = task.checklist?.filter((item) => item.done).length ?? 0;
            const totalCount = task.checklist?.length ?? 0;

            return (
              <TableRow
                key={task.id}
                onClick={() => onOpenTask(task.id)}
                className="cursor-pointer border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)]"
              >
                <TableCell className="px-3">
                  {task.status === 'DONE' ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  ) : canEditTask(task) ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={t('tasks.markDone')}
                          onClick={(event) => {
                            event.stopPropagation();
                            onStatusChange(task.id, 'DONE', task.title);
                          }}
                          className="flex size-5 items-center justify-center rounded-full border border-[var(--color-border-strong)] text-transparent transition-colors hover:border-[var(--color-success)] hover:bg-[var(--color-success)]/20 hover:text-[var(--color-success-text)]"
                        >
                          <Check className="size-3.5" strokeWidth={3} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">{t('tasks.markDone')}</TooltipContent>
                    </Tooltip>
                  ) : null}
                </TableCell>

                <TableCell className="max-w-[420px] py-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-[var(--color-text)]">{task.title}</span>
                    <TagBadge tag={task.tag} />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
                    <span className="inline-flex items-center gap-1.5" title={t('common.creatorShort')}>
                      <MemberAvatar
                        slot={memberOf(task.creator_id)?.slot}
                        name={memberOf(task.creator_id)?.display_name}
                        size="xs"
                        tooltip
                      />
                      <span className="max-w-[110px] truncate">
                        {memberOf(task.creator_id)?.display_name ?? t('assignee.unknown')}
                      </span>
                    </span>
                    <span aria-hidden="true">·</span>
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
                    {totalCount > 0 && (
                      <span className="font-mono text-[var(--color-brand)]">
                        {doneCount}/{totalCount}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="py-3">
                  <StatusBadge status={task.status} compact />
                </TableCell>

                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <MemberAvatar slot={assignee?.slot} name={assignee?.display_name} size="xs" />
                    <span className="truncate text-xs text-[var(--color-text)]">
                      {assignee?.display_name ?? t(task.assignee_id ? 'assignee.unknown' : 'assignee.unassigned')}
                    </span>
                  </div>
                </TableCell>

                <TableCell className={cn('py-3 text-xs', overdue ? 'font-semibold text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]')}>
                  {task.deadline ? formatDate(task.deadline) : t('tasks.noDueDate')}
                </TableCell>

                <TableCell className="hidden py-3 md:table-cell">
                  <PriorityBadge priority={task.priority} />
                </TableCell>

                <TableCell className="hidden py-3 md:table-cell">
                  <div className="flex items-center gap-2">
                    <Progress value={task.progress} className="h-1.5 flex-1" />
                    <span className="w-8 text-right text-[11px] font-mono text-[var(--color-text-muted)]">{task.progress}%</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
