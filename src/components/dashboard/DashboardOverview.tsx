'use client';

import React from 'react';
import {
  Clock,
  AlertTriangle,
  Video,
  FileBox,
  TrendingUp,
  Play,
  ArrowRight,
  User,
  Calendar,
} from 'lucide-react';
import { Task, GameplayVideo, FileRecord, ProjectRole } from '@/types/database';
import { useLocale } from '@/i18n/useLocale';
import { Card } from '@/components/ui/Card';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getSlotDisplayName } from '@/lib/profile';

interface DashboardOverviewProps {
  tasks: Task[];
  videos: GameplayVideo[];
  files: FileRecord[];
  currentUserId: string;
  userRole?: ProjectRole;
  onSelectTask: (task: Task) => void;
  onSelectVideo: (video: GameplayVideo) => void;
  onNavigateTab: (tab: string) => void;
  profileNames?: Record<string, string>;
}

export default function DashboardOverview({
  tasks,
  videos,
  files,
  currentUserId,
  onSelectTask,
  onSelectVideo,
  onNavigateTab,
  profileNames = {},
}: DashboardOverviewProps) {
  const { t, formatDate, formatBytes, formatDuration, formatNumber, isOverdue } = useLocale();

  // 1. Tiến độ tổng thể
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // 2. Task của tôi (assignee_id === currentUserId && status !== 'DONE')
  const myTasks = tasks
    .filter((t) => t.assignee_id === currentUserId && t.status !== 'DONE')
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  // 3. Task quá deadline (deadline < now && status !== 'DONE')
  const overdueTasks = tasks.filter((t) => t.status !== 'DONE' && isOverdue(t.deadline, t.status));

  // 4. Video mới nhất & File mới nhất
  const latestVideos = [...videos]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const latestFiles = [...files]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng tiến độ */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--color-text-muted)]">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t('dashboard.progress')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-indigo-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              {totalTasks === 0 ? (
                <span className="text-xl font-bold text-[var(--color-text-muted)]">
                  {t('dashboard.noTasks')}
                </span>
              ) : (
                <>
                  <span className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
                    {formatNumber(progressPercent)}%
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {t('dashboard.tasksCount', {
                      done: formatNumber(doneTasks),
                      total: formatNumber(totalTasks),
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="mt-4">
            {totalTasks > 0 ? (
              <div className="w-full bg-[var(--color-surface-raised)] rounded-full h-2 overflow-hidden border border-[var(--color-border)]">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">{t('dashboard.startFirstTask')}</p>
            )}
          </div>
        </Card>

        {/* Card 2: Task đang làm */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--color-text-muted)]">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t('dashboard.developing')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
                {formatNumber(inProgressTasks)}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {t('dashboard.inProgressSubtitle')}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            {t('dashboard.myTasksCount', { count: formatNumber(myTasks.length) })}
          </p>
        </Card>

        {/* Card 3: Task quá hạn */}
        <Card
          className={`flex flex-col justify-between transition-colors ${
            overdueTasks.length > 0
              ? 'border-rose-500/30 bg-rose-950/10'
              : 'border-[var(--color-border)]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-[var(--color-text-muted)]">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t('dashboard.overdue')}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  overdueTasks.length > 0
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span
                className={`text-3xl font-extrabold tracking-tight ${
                  overdueTasks.length > 0 ? 'text-rose-400' : 'text-[var(--color-text)]'
                }`}
              >
                {formatNumber(overdueTasks.length)}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {t('dashboard.overdueSubtitle')}
              </span>
            </div>
          </div>
          <p
            className={`mt-4 text-xs font-medium ${
              overdueTasks.length > 0 ? 'text-rose-400/90' : 'text-[var(--color-text-muted)]'
            }`}
          >
            {overdueTasks.length > 0
              ? t('dashboard.urgentWarning')
              : t('dashboard.onSchedule')}
          </p>
        </Card>

        {/* Card 4: Tổng kho Gameplay & File */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--color-text-muted)]">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t('dashboard.vault')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <FileBox className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
                {formatNumber(videos.length)}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {t('dashboard.vaultSubtitle', {
                  videos: formatNumber(videos.length),
                  files: formatNumber(files.length),
                })}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            {t('dashboard.r2Storage')}
          </p>
        </Card>
      </div>

      {/* Main Grid: Left = Tasks, Right = Videos & Files */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tasks của tôi & Tasks quá hạn */}
        <div className="lg:col-span-7 space-y-6">
          {/* Overdue Alert Section */}
          {overdueTasks.length > 0 && (
            <Card className="border-rose-500/30 bg-rose-950/15">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    {t('dashboard.overdueSectionTitle', { count: formatNumber(overdueTasks.length) })}
                  </span>
                </div>
                <button
                  onClick={() => onNavigateTab('tasks')}
                  className="text-xs text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {t('dashboard.viewAll')} <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2.5">
                {overdueTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="flex items-center justify-between p-3 rounded-xl border border-rose-500/25 bg-rose-950/25 hover:bg-rose-950/40 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-rose-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{t('dashboard.deadlinePrefix', { date: formatDate(task.deadline) })}</span>
                        <span className="text-[var(--color-text-muted)]">•</span>
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full border border-rose-500/30 text-rose-300 bg-rose-500/10 font-medium">
                      {t('dashboard.overdueBadge')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* My Assigned Tasks */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-[var(--color-text)] text-sm">
                <User className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>
                  {t('dashboard.myUpcomingTasks', { count: formatNumber(myTasks.length) })}
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('tasks')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                {t('dashboard.viewTaskboard')} <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-[var(--color-text-muted)] text-xs">{t('dashboard.noTasksInProject')}</p>
                <Button
                  size="sm"
                  onClick={() => onNavigateTab('tasks')}
                >
                  {t('dashboard.createFirstTask')}
                </Button>
              </div>
            ) : myTasks.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-text-muted)] text-xs">
                {t('dashboard.noPendingTasks')}
              </div>
            ) : (
              <div className="space-y-2.5">
                {myTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)] cursor-pointer transition-all duration-150"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <p className="text-sm font-medium text-[var(--color-text)] mt-1.5 truncate">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--color-text-muted)]">
                        <span>{t('dashboard.deadlinePrefix', { date: formatDate(task.deadline) })}</span>
                        <span>•</span>
                        <span>{t('dashboard.progressPercent', { percent: task.progress })}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 text-[var(--color-text-muted)]">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Latest Gameplay Videos & Latest Files */}
        <div className="lg:col-span-5 space-y-6">
          {/* Latest Gameplay Videos */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-[var(--color-text)] text-sm">
                <Video className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{t('dashboard.latestVideos')}</span>
              </div>
              <button
                onClick={() => onNavigateTab('videos')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                {t('dashboard.viewAll')} <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {latestVideos.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-[var(--color-text-muted)] text-xs">{t('dashboard.noVideos')}</p>
                <Button
                  size="sm"
                  onClick={() => onNavigateTab('videos')}
                >
                  {t('dashboard.uploadVideo')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {latestVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => onSelectVideo(video)}
                    className="group flex gap-3 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)] cursor-pointer transition-all duration-150"
                  >
                    <div className="relative w-28 h-18 rounded-lg overflow-hidden bg-black shrink-0">
                      {video.thumbnail_key ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={video.thumbnail_key}
                          alt={video.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                          <Video className="h-6 w-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Play className="h-6 w-6 text-white drop-shadow" fill="white" />
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[10px] text-[var(--color-text)] font-mono">
                        {formatDuration(video.duration)}
                      </span>
                    </div>

                    <div className="min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-[var(--color-surface)] text-[var(--color-text)] px-1.5 py-0.5 rounded font-mono font-medium border border-[var(--color-border)]">
                            {video.version}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[var(--color-text)] mt-1 line-clamp-2">
                          {video.title}
                        </p>
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-[var(--color-text)]">
                          <User className="h-3 w-3 text-indigo-400 shrink-0" />
                          {getSlotDisplayName(video.uploaded_by, profileNames, t('assignee.unknown'))}
                        </span>
                        <span>•</span>
                        <span>{formatBytes(video.size)}</span>
                        <span>•</span>
                        <span>{formatDate(video.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Latest Files Vault */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-[var(--color-text)] text-sm">
                <FileBox className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{t('dashboard.latestFiles')}</span>
              </div>
              <button
                onClick={() => onNavigateTab('files')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                {t('dashboard.viewAll')} <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {latestFiles.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-[var(--color-text-muted)] text-xs">{t('dashboard.noFiles')}</p>
                <Button
                  size="sm"
                  onClick={() => onNavigateTab('files')}
                >
                  {t('dashboard.uploadFile')}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {latestFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-[var(--color-text)] truncate">{file.name}</p>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="uppercase text-indigo-400 font-mono font-semibold">{file.folder}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-medium text-[var(--color-text)]">
                          <User className="h-3 w-3 text-indigo-400 shrink-0" />
                          {getSlotDisplayName(file.uploaded_by, profileNames, t('assignee.unknown'))}
                        </span>
                        <span>•</span>
                        <span>{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span>{formatDate(file.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
