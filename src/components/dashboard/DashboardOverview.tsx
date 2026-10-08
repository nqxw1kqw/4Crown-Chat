'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  FileBox,
  FileText,
  Play,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/components/providers/AppDataProvider';
import { useLocale } from '@/i18n/useLocale';
import { PriorityBadge, StatusBadge, TagBadge } from '@/components/common/badges';
import MemberAvatar from '@/components/common/member-avatar';
import LinkedTaskChip from '@/components/common/linked-task-chip';
import type { Task } from '@/types/database';
import { cn } from '@/lib/utils';

const DONUT_COLORS = ['#1868DB', '#94C748', '#F5A623', '#CA3521', '#626F86'];

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'brand' | 'success' | 'danger';
}) {
  const tones = {
    neutral: 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]',
    brand: 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]',
    success: 'bg-[var(--color-success-soft)] text-[var(--color-success-text)]',
    danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  };

  return (
    <Card className="h-full gap-0 rounded-lg py-0 shadow-none">
      <CardContent className="flex h-full flex-col justify-between px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</span>
          <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', tones[tone])}>
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-2 text-[22px] leading-none font-bold tracking-tight text-[var(--color-text)]">{value}</p>
        {hint && <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, href, linkLabel }: { icon: LucideIcon; title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-[var(--color-text-muted)]" aria-hidden="true" />
        <CardTitle className="text-[13px] font-semibold">{title}</CardTitle>
      </div>
      <Button asChild variant="ghost" size="xs" className="text-[var(--color-brand)]">
        <Link href={href}>
          {linkLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}

function TaskRow({ task, onOpen }: { task: Task; onOpen: (taskId: string) => void }) {
  const { t, formatDate, isOverdue } = useLocale();
  const { members } = useAppData();
  const overdue = isOverdue(task.deadline, task.status);
  const creator = members.find((m) => m.id === task.creator_id);
  const assignee = members.find((m) => m.id === task.assignee_id);

  return (
    <li
      onClick={() => onOpen(task.id)}
      className="flex cursor-pointer items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]"
    >
      <StatusBadge status={task.status} compact className="w-[92px] shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-[var(--color-text)]">{task.title}</p>
          <TagBadge tag={task.tag} />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <PriorityBadge priority={task.priority} />
          <span aria-hidden="true">·</span>
          <span className={cn(overdue && 'font-semibold text-[var(--color-danger)]')}>
            {t('dashboard.deadlinePrefix', { date: formatDate(task.deadline) })}
          </span>
          {task.progress > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{t('dashboard.progressPercent', { percent: task.progress })}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <MemberAvatar slot={creator?.slot} name={creator?.display_name} size="xs" tooltip />
        <span className="text-[10px] text-[var(--color-text-muted)]" aria-hidden="true">
          →
        </span>
        <MemberAvatar slot={assignee?.slot} name={assignee?.display_name} size="xs" tooltip />
      </div>
    </li>
  );
}

export default function DashboardOverview() {
  const { t, locale, formatBytes, formatDuration, formatNumber, isOverdue } = useLocale();
  const { tasks, videos, files, members, session, project, memberName, can } = useAppData();
  const router = useRouter();
  const intlLocale = locale === 'ja' ? 'ja-JP' : 'vi-VN';

  const doneTasks = tasks.filter((task) => task.status === 'DONE').length;
  const progressPercent = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const inProgressTasks = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
  const overdueTasks = tasks.filter((task) => task.status !== 'DONE' && isOverdue(task.deadline, task.status));

  const myTasks = tasks
    .filter((task) => task.assignee_id === session?.userId && task.status !== 'DONE')
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return Date.parse(a.deadline) - Date.parse(b.deadline);
    });

  const myName = members.find((m) => m.slot === session?.slot)?.display_name ?? '';
  const latestVideos = videos.slice(0, 2);
  const latestFiles = files.slice(0, 3);
  const taskOf = (taskId: string | null) => tasks.find((task) => task.id === taskId);

  const workload = members
    .map((member) => ({
      member,
      open: tasks.filter((task) => task.assignee_id === member.id && task.status !== 'DONE').length,
    }))
    .filter((row) => row.open > 0)
    .sort((a, b) => b.open - a.open);

  const openTotal = workload.reduce((sum, row) => sum + row.open, 0);
  const donutCircumference = 2 * Math.PI * 40;
  const donutSegments = workload.map((row, index) => {
    const prior = workload.slice(0, index).reduce((sum, r) => sum + r.open, 0);
    return {
      id: row.member.id,
      length: (row.open / openTotal) * donutCircumference,
      offset: -(prior / openTotal) * donutCircumference,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[var(--color-text)]">{t('dashboard.greeting', { name: myName })}</h1>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {project?.name ?? t('nav.brand')} ·{' '}
            {new Intl.DateTimeFormat(intlLocale, { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/tasks?view=kanban">{t('dashboard.viewTaskboard')}</Link>
          </Button>
          {can.contribute && (
            <Button size="sm" onClick={() => router.push('/tasks?new=1')}>
              <Plus className="size-4" />
              {t('tasks.createTaskShort')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 items-stretch gap-3 xl:grid-cols-4">
        <Metric
          label={t('dashboard.progress')}
          value={tasks.length === 0 ? t('dashboard.noTasks') : `${formatNumber(progressPercent)}%`}
          hint={tasks.length === 0 ? t('dashboard.startFirstTask') : t('dashboard.tasksCount', { done: formatNumber(doneTasks), total: formatNumber(tasks.length) })}
          icon={TrendingUp}
          tone="brand"
        />
        <Metric
          label={t('dashboard.developing')}
          value={formatNumber(inProgressTasks)}
          hint={t('dashboard.inProgressSubtitle')}
          icon={CalendarDays}
        />
        <Metric
          label={t('dashboard.overdue')}
          value={formatNumber(overdueTasks.length)}
          hint={overdueTasks.length > 0 ? t('dashboard.urgentWarning') : t('dashboard.onSchedule')}
          icon={AlertTriangle}
          tone={overdueTasks.length > 0 ? 'danger' : 'success'}
        />
        <Metric
          label={t('dashboard.vault')}
          value={formatNumber(videos.length + files.length)}
          hint={t('dashboard.vaultSubtitle', { videos: formatNumber(videos.length), files: formatNumber(files.length) })}
          icon={FileBox}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-12">
        <Card className="h-full gap-0 rounded-lg py-0 shadow-none xl:col-span-8 xl:col-start-1 xl:row-start-1">
          <CardHeader className="border-b border-[var(--color-border)] px-4 py-3">
              <SectionHeader icon={CalendarDays} title={t('dashboard.myUpcomingTasks', { count: formatNumber(myTasks.length) })} href="/tasks?view=table" linkLabel={t('dashboard.viewTaskboard')} />
            </CardHeader>
            <CardContent className="px-4 py-3">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-xs text-[var(--color-text-muted)]">{t('dashboard.noTasksInProject')}</p>
                  {can.contribute && (
                    <Button size="sm" onClick={() => router.push('/tasks?new=1')}>
                      <Plus className="size-4" />
                      {t('dashboard.createFirstTask')}
                    </Button>
                  )}
                </div>
              ) : myTasks.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">{t('dashboard.noPendingTasks')}</p>
              ) : (
                <ul className="space-y-2">
                  {myTasks.slice(0, 5).map((task) => (
                    <TaskRow key={task.id} task={task} onOpen={(id) => router.push(`/tasks/${id}`)} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {overdueTasks.length > 0 && (
            <Card className="h-full gap-0 rounded-lg border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] py-0 shadow-none xl:col-span-8 xl:col-start-1 xl:row-start-2">
              <CardHeader className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[var(--color-danger)]">
                    <AlertTriangle className="size-4" />
                    <CardTitle className="text-[13px] font-semibold">
                      {t('dashboard.overdueSectionTitle', { count: formatNumber(overdueTasks.length) })}
                    </CardTitle>
                  </div>
                  <Button asChild variant="ghost" size="xs">
                    <Link href="/tasks?view=table">{t('dashboard.viewAll')}</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 px-4 pb-4">
                {overdueTasks.slice(0, 4).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-danger)]/25 bg-[var(--color-bg)] px-2.5 py-1.5 text-left text-[11px] transition-colors hover:border-[var(--color-danger)]/50"
                  >
                    <span className="max-w-[220px] truncate font-medium text-[var(--color-text)]">{task.title}</span>
                    <span className="font-semibold text-[var(--color-danger)]">
                      {t('dashboard.overdueBadge')}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="h-full gap-0 rounded-lg py-0 shadow-none xl:col-span-4 xl:col-start-9 xl:row-start-1">
            <CardHeader className="border-b border-[var(--color-border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                <CardTitle className="text-[13px] font-semibold">{t('dashboard.teamWorkload')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 py-3">
              {openTotal === 0 ? (
                <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">{t('common.noOpenTasks')}</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative size-[104px] shrink-0">
                    <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={t('dashboard.teamWorkload')}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-surface-raised)" strokeWidth="14" />
                      {donutSegments.map((segment) => (
                        <circle
                          key={segment.id}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="14"
                          strokeDasharray={`${segment.length} ${donutCircumference - segment.length}`}
                          strokeDashoffset={segment.offset}
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-base leading-none font-bold text-[var(--color-text)]">{formatNumber(openTotal)}</span>
                      <span className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">{t('nav.tasks')}</span>
                    </div>
                  </div>

                  <ul className="min-w-0 flex-1 space-y-1.5">
                    {workload.map((row, index) => (
                      <li key={row.member.id} className="flex items-center gap-2 text-[11px]">
                        <span
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                          aria-hidden="true"
                        />
                        <MemberAvatar slot={row.member.slot} name={row.member.display_name} size="xs" />
                        <span className="min-w-0 flex-1 truncate text-[var(--color-text)]">{row.member.display_name}</span>
                        <span className="shrink-0 font-mono text-[var(--color-text-muted)]">
                          {formatNumber(row.open)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full gap-0 rounded-lg py-0 shadow-none xl:col-span-4 xl:col-start-9 xl:row-start-2">
            <CardHeader className="border-b border-[var(--color-border)] px-4 py-3">
              <SectionHeader icon={FileBox} title={t('dashboard.vault')} href="/files" linkLabel={t('dashboard.viewAll')} />
            </CardHeader>
            <CardContent className="space-y-2 px-4 py-3">
              {latestVideos.length === 0 && latestFiles.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-5 text-center">
                  <p className="text-xs text-[var(--color-text-muted)]">{t('dashboard.noFiles')}</p>
                  <Button size="sm" variant="outline" onClick={() => router.push('/files')}>
                    {t('dashboard.uploadFile')}
                  </Button>
                </div>
              ) : (
                <>
                  {latestVideos.map((video) => (
                    <div key={video.id} className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => router.push(`/videos/${video.id}`)}
                        className="group relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md bg-[var(--color-surface-raised)]"
                        aria-label={video.title}
                      >
                        {video.thumbnail_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={video.thumbnail_url} alt="" loading="lazy" className="size-full object-cover" />
                        ) : (
                          <Play className="absolute inset-0 m-auto size-4 text-[var(--color-text-muted)]" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-[var(--color-text)]">{video.title}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          v{video.version} · {formatBytes(video.size)} · {formatDuration(video.duration)}
                        </p>
                        <LinkedTaskChip task={taskOf(video.linked_task_id)} className="mt-1 max-w-full" />
                      </div>
                    </div>
                  ))}

                  {latestFiles.map((file) => (
                    <div key={file.id} className="flex items-start gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                        <FileText className="size-4 text-[var(--color-text-muted)]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-[var(--color-text)]">{file.name}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          <span className="font-mono uppercase text-[var(--color-brand)]">{file.folder}</span> ·{' '}
                          {formatBytes(file.size)} · {memberName(file.uploaded_by) ?? '—'}
                        </p>
                        <LinkedTaskChip task={taskOf(file.linked_task_id)} className="mt-1 max-w-full" />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
