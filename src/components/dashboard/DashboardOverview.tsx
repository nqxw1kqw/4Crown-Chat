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
import { formatBytes, formatDuration, formatDate, isOverdue } from '@/lib/utils';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/lib/constants';

interface DashboardOverviewProps {
  tasks: Task[];
  videos: GameplayVideo[];
  files: FileRecord[];
  currentUserId: string;
  userRole?: ProjectRole;
  onSelectTask: (task: Task) => void;
  onSelectVideo: (video: GameplayVideo) => void;
  onNavigateTab: (tab: string) => void;
}

export default function DashboardOverview({
  tasks,
  videos,
  files,
  currentUserId,
  onSelectTask,
  onSelectVideo,
  onNavigateTab,
}: DashboardOverviewProps) {
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
  const overdueTasks = tasks.filter((t) => t.status !== 'DONE' && isOverdue(t.deadline));

  // 4. Video mới nhất & File mới nhất
  const latestVideos = [...videos].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 3);

  const latestFiles = [...files].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng tiến độ */}
        <div className="rounded-2xl border border-[#1f2330] bg-[#12141d] p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tiến độ dự án</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            {totalTasks === 0 ? (
              <span className="text-xl font-bold text-zinc-300">Chưa có task nào</span>
            ) : (
              <>
                <span className="text-3xl font-extrabold text-white tracking-tight">{progressPercent}%</span>
                <span className="text-xs text-zinc-300">({doneTasks}/{totalTasks} task)</span>
              </>
            )}
          </div>
          {totalTasks > 0 ? (
            <div className="mt-3 w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          ) : (
            <p className="mt-3 text-xs text-zinc-400">Bắt đầu bằng cách tạo task đầu tiên</p>
          )}
        </div>

        {/* Card 2: Task đang làm */}
        <div className="rounded-2xl border border-[#1f2330] bg-[#12141d] p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Đang phát triển</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{inProgressTasks}</span>
            <span className="text-xs text-zinc-400">task đang code/làm art</span>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            {myTasks.length} task thuộc trách nhiệm của bạn
          </p>
        </div>

        {/* Card 3: Task quá hạn */}
        <div className={`rounded-2xl border p-5 shadow-sm transition-colors ${
          overdueTasks.length > 0
            ? 'border-rose-500/30 bg-rose-950/10'
            : 'border-[#1f2330] bg-[#12141d]'
        }`}>
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Quá Deadline</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              overdueTasks.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-800 text-zinc-400'
            }`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight ${
              overdueTasks.length > 0 ? 'text-rose-400' : 'text-zinc-200'
            }`}>
              {overdueTasks.length}
            </span>
            <span className="text-xs text-zinc-400">task cần xử lý gấp</span>
          </div>
          <p className="mt-3 text-xs text-rose-400/80 font-medium">
            {overdueTasks.length > 0 ? 'Cần bàn giao ngay để tránh trễ build' : 'Tiến độ đang được đảm bảo'}
          </p>
        </div>

        {/* Card 4: Tổng kho Gameplay & File */}
        <div className="rounded-2xl border border-[#1f2330] bg-[#12141d] p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Kho Gameplay & File</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileBox className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{videos.length}</span>
            <span className="text-xs text-zinc-400">video / {files.length} build & asset</span>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            Lưu trực tiếp Cloudflare R2 (Private)
          </p>
        </div>
      </div>

      {/* Main Grid: Left = Tasks, Right = Videos & Files */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tasks của tôi & Tasks quá hạn */}
        <div className="lg:col-span-7 space-y-6">
          {/* Overdue Alert Section */}
          {overdueTasks.length > 0 && (
            <div className="rounded-2xl border border-rose-500/30 bg-[#171217] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Cảnh báo: Task quá hạn ({overdueTasks.length})</span>
                </div>
                <button
                  onClick={() => onNavigateTab('tasks')}
                  className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                >
                  Xem tất cả <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2.5">
                {overdueTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="flex items-center justify-between p-3 rounded-xl border border-rose-500/20 bg-rose-950/20 hover:bg-rose-950/40 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium text-zinc-200 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-rose-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Hạn: {formatDate(task.deadline)}</span>
                        <span className="text-zinc-500">•</span>
                        <span className={TASK_PRIORITY_CONFIG[task.priority].color}>
                          {TASK_PRIORITY_CONFIG[task.priority].label}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full border border-rose-500/30 text-rose-300 bg-rose-500/10 font-medium">
                      Quá hạn
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Assigned Tasks */}
          <div className="rounded-2xl border border-[#1f2330] bg-[#12141d] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-zinc-200 text-sm">
                <User className="h-4 w-4 text-indigo-400" />
                <span>Task của tôi sắp tới hạn ({myTasks.length})</span>
              </div>
              <button
                onClick={() => onNavigateTab('tasks')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Xem Taskboard <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-zinc-400 text-xs">Chưa có task nào trong dự án.</p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('tasks')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                >
                  Tạo task đầu tiên
                </button>
              </div>
            ) : myTasks.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs">
                Tuyệt vời! Bạn không còn task nào dang dở.
              </div>
            ) : (
              <div className="space-y-2.5">
                {myTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800/80 bg-[#161924] hover:border-zinc-700 hover:bg-[#1a1d2b] cursor-pointer transition-all"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TASK_STATUS_CONFIG[task.status].color}`}>
                          {TASK_STATUS_CONFIG[task.status].label}
                        </span>
                        <span className={`text-xs font-medium ${TASK_PRIORITY_CONFIG[task.priority].color}`}>
                          {TASK_PRIORITY_CONFIG[task.priority].label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-200 mt-1.5 truncate">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                        <span>Hạn: {formatDate(task.deadline)}</span>
                        <span>•</span>
                        <span>Tiến độ: {task.progress}%</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 text-zinc-400">
                      <ArrowRight className="h-4 w-4 text-zinc-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Latest Gameplay Videos & Latest Files */}
        <div className="lg:col-span-5 space-y-6">
          {/* Latest Gameplay Videos */}
          <div className="rounded-2xl border border-[#1f2330] bg-[#12141d] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-zinc-200 text-sm">
                <Video className="h-4 w-4 text-rose-400" />
                <span>Video Gameplay mới nhất</span>
              </div>
              <button
                onClick={() => onNavigateTab('videos')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Tất cả <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {latestVideos.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-zinc-400 text-xs">Chưa có video gameplay nào được tải lên.</p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('videos')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                >
                  Tải video lên
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {latestVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => onSelectVideo(video)}
                    className="group flex gap-3 p-2.5 rounded-xl border border-zinc-800/80 bg-[#161924] hover:border-zinc-700 hover:bg-[#1a1d2b] cursor-pointer transition-all"
                  >
                    <div className="relative w-28 h-18 rounded-lg overflow-hidden bg-black shrink-0">
                      {video.thumbnail_key ? (
                        <img
                          src={video.thumbnail_key}
                          alt={video.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                          <Video className="h-6 w-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-6 w-6 text-white drop-shadow" fill="white" />
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[10px] text-zinc-300 font-mono">
                        {formatDuration(video.duration)}
                      </span>
                    </div>

                    <div className="min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono font-medium">
                            {video.version}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-zinc-200 mt-1 line-clamp-2">
                          {video.title}
                        </p>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-1">
                        {formatBytes(video.size)} • {formatDate(video.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest Files Vault */}
          <div className="rounded-2xl border border-[#1f2330] bg-[#12141d] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-zinc-200 text-sm">
                <FileBox className="h-4 w-4 text-emerald-400" />
                <span>File build & Asset mới nhất</span>
              </div>
              <button
                onClick={() => onNavigateTab('files')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Tất cả <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {latestFiles.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-zinc-400 text-xs">Chưa có file nào trong kho.</p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('files')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                >
                  Tải file lên
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {latestFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800/80 bg-[#161924] text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-zinc-200 truncate">{file.name}</p>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        <span className="uppercase text-indigo-400 font-mono font-semibold">{file.folder}</span> • {formatBytes(file.size)} • {formatDate(file.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
