'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Calendar,
  User,
  ArrowRight,
  ListTodo,
  LayoutList,
  Kanban,
  GripVertical,
  X,
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '@/types/database';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, DEFAULT_PROJECT_ID } from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';
import { useLocale } from '@/i18n/useLocale';
import { TranslationKey } from '@/i18n/dictionaries/vi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PriorityBadge } from '@/components/ui/Badge';
import { SlotId, SLOT_IDS, getSlotDisplayName } from '@/lib/profile';
import TaskDetailModal from './TaskDetailModal';

interface TaskListProps {
  tasks: Task[];
  profileNames: Record<SlotId, string>;
  currentSlotId: SlotId | null;
  onUpdateTask: (taskId: string, updated: Partial<Task>) => void;
  onCreateTask: (newTask: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  onDeleteTask?: (taskId: string) => void;
  selectedTaskId?: string | null;
  onClearSelectedTaskId?: () => void;
}

const STATUS_GROUPS: { status: TaskStatus; countColor: string }[] = [
  { status: 'TODO', countColor: 'text-[var(--color-text-muted)] bg-[var(--color-surface-raised)]' },
  { status: 'IN_PROGRESS', countColor: 'text-[var(--color-info)] bg-blue-500/10' },
  { status: 'REVIEW', countColor: 'text-[var(--color-warning)] bg-amber-500/10' },
  { status: 'DONE', countColor: 'text-[var(--color-success)] bg-emerald-500/10' },
  { status: 'BLOCKED', countColor: 'text-[var(--color-danger)] bg-rose-500/10' },
];

export default function TaskList({
  tasks,
  profileNames,
  currentSlotId,
  onUpdateTask,
  onCreateTask,
  onDeleteTask,
  selectedTaskId,
  onClearSelectedTaskId,
}: TaskListProps) {
  const { t, formatDate, isOverdue } = useLocale();
  const { success, error } = useToast();
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [activeModalTask, setActiveModalTask] = useState<Task | null>(
    selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) || null : null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state cho tạo task mới
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus>('TODO');
  const [newPriority, setNewPriority] = useState<TaskPriority>('NORMAL');
  const [newAssigneeId, setNewAssigneeId] = useState<string>(currentSlotId || '');
  const [newDeadline, setNewDeadline] = useState('');

  // Đọc tùy chọn chế độ hiển thị từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('task_view_mode');
      if (saved === 'kanban' || saved === 'list') {
        const timer = setTimeout(() => {
          setViewMode(saved);
        }, 0);
        return () => clearTimeout(timer);
      }
    } catch {
      // Bỏ qua lỗi truy cập localStorage
    }
  }, []);

  // Lắng nghe phím Esc để đóng modal tạo task
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCreateModal) {
        setShowCreateModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]);

  const handleToggleViewMode = (mode: 'list' | 'kanban') => {
    setViewMode(mode);
    try {
      localStorage.setItem('task_view_mode', mode);
    } catch {
      // Bỏ qua lỗi
    }
  };

  // Lọc task theo người phụ trách và từ khóa tìm kiếm
  const filteredTasks = tasks.filter((task) => {
    if (filterAssignee === 'MINE') {
      if (task.assignee_id !== currentSlotId) return false;
    } else if (filterAssignee === 'UNASSIGNED') {
      if (task.assignee_id) return false;
    } else if (filterAssignee !== 'ALL') {
      if (task.assignee_id !== filterAssignee) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  // Optimistic update khi thay đổi trạng thái
  const handleQuickStatusChange = (task: Task, nextStatus: TaskStatus) => {
    if (task.status === nextStatus) return;
    const oldStatus = task.status;
    const statusLabel = t(`status.${nextStatus}` as TranslationKey);
    try {
      onUpdateTask(task.id, { status: nextStatus });
      success(
        t('tasks.statusUpdatedTitle'),
        t('tasks.statusUpdatedMsg', { title: task.title, status: statusLabel })
      );
    } catch {
      onUpdateTask(task.id, { status: oldStatus });
      error(t('tasks.statusUpdateFailed'), t('tasks.statusRollbackMsg'));
    }
  };

  // Kéo thả Kanban (Drag and Drop - Luôn cho phép mọi người)
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    handleQuickStatusChange(targetTask, targetStatus);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onCreateTask({
      project_id: tasks[0]?.project_id || DEFAULT_PROJECT_ID,
      title: newTitle.trim(),
      description: newDescription.trim(),
      status: newStatus,
      priority: newPriority,
      assignee_id: newAssigneeId || null,
      creator_id: currentSlotId || 'm1',
      progress: 0,
      deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
      checklist: [],
    });

    success(t('tasks.taskCreatedTitle'), t('tasks.taskCreatedMsg', { title: newTitle.trim() }));

    setNewTitle('');
    setNewDescription('');
    setNewStatus('TODO');
    setNewPriority('NORMAL');
    setNewAssigneeId(currentSlotId || '');
    setNewDeadline('');
    setShowCreateModal(false);
  };

  const formatTaskAssignee = (assigneeId?: string | null) => {
    if (!assigneeId) return t('assignee.unassigned');
    return getSlotDisplayName(assigneeId, profileNames, t('assignee.unknown'));
  };

  return (
    <div className="space-y-6">
      {/* Action Bar: Search, Filter, Mode Toggle & Create Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('tasks.searchPlaceholder')}
              aria-label={t('tasks.searchAria')}
              className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] pl-9 pr-4 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          {/* Assignee Filter (Lấy từ 4 slot cố định) */}
          <div className="relative">
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              aria-label={t('tasks.filterAssigneeAria')}
              className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
            >
              <option value="ALL">{t('tasks.allAssignees')}</option>
              {currentSlotId && (
                <option value="MINE">★ {profileNames[currentSlotId]} ({t('tasks.filterMine')})</option>
              )}
              {SLOT_IDS.map((slotId) => (
                <option key={slotId} value={slotId}>
                  {profileNames[slotId]} ({slotId.toUpperCase()})
                </option>
              ))}
              <option value="UNASSIGNED">{t('assignee.unassigned')}</option>
            </select>
          </div>

          {/* Toggle Chế độ hiển thị Danh sách / Kanban */}
          <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => handleToggleViewMode('list')}
              aria-label={t('tasks.viewList')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[var(--color-accent)] text-white shadow-sm font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>{t('tasks.viewList')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('kanban')}
              aria-label={t('tasks.viewKanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-[var(--color-accent)] text-white shadow-sm font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>{t('tasks.viewKanban')}</span>
            </button>
          </div>
        </div>

        {/* Create Task Button (Luôn bật cho mọi thành viên) */}
        <div className="shrink-0">
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={Plus}
          >
            {t('tasks.createTask')}
          </Button>
        </div>
      </div>

      {/* Trạng thái trống (Empty State) */}
      {filteredTasks.length === 0 && (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-3">
            <ListTodo className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">
            {t('tasks.emptyTitle')}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] max-w-sm mb-4">
            {t('tasks.emptyDescription')}
          </p>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            icon={Plus}
          >
            {t('tasks.createTask')}
          </Button>
        </Card>
      )}

      {/* Chế độ Bảng Kanban (5 Cột) */}
      {viewMode === 'kanban' && tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {STATUS_GROUPS.map((group) => {
            const groupTasks = filteredTasks.filter((t) => t.status === group.status);
            const statusTitle = t(`status.${group.status}` as TranslationKey);

            return (
              <div
                key={group.status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, group.status)}
                className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm transition-colors"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-raised)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                      {statusTitle}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border border-[var(--color-border)] ${group.countColor}`}>
                      {groupTasks.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-3 flex-1 space-y-3 min-h-[300px]">
                  {groupTasks.length === 0 ? (
                    <div className="h-32 border border-dashed border-[var(--color-border)] rounded-xl flex items-center justify-center text-xs text-[var(--color-text-muted)] text-center p-3">
                      {t('tasks.kanbanDropPlaceholder')}
                    </div>
                  ) : (
                    groupTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => setActiveModalTask(task)}
                        className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)] cursor-grab active:cursor-grabbing transition-all duration-150 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <PriorityBadge priority={task.priority} />
                          <GripVertical className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
                        </div>

                        <h4 className="text-xs font-semibold text-[var(--color-text)] mt-1.5 line-clamp-2">
                          {task.title}
                        </h4>

                        <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                          <span className="truncate max-w-[100px]">
                            {formatTaskAssignee(task.assignee_id)}
                          </span>
                          {task.deadline && (
                            <span
                              className={
                                task.status !== 'DONE' && isOverdue(task.deadline, task.status)
                                  ? 'text-[var(--color-danger)] font-semibold'
                                  : 'text-[var(--color-text-muted)]'
                              }
                            >
                              {formatDate(task.deadline)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chế độ Danh sách (List View) */}
      {viewMode === 'list' && tasks.length > 0 && (
        <div className="space-y-6">
          {STATUS_GROUPS.map((group) => {
            const groupTasks = filteredTasks.filter((t) => t.status === group.status);
            const statusTitle = t(`status.${group.status}` as TranslationKey);

            return (
              <Card
                key={group.status}
                padding="none"
                className="overflow-hidden"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                      {statusTitle}
                    </h3>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border border-[var(--color-border)] ${group.countColor}`}>
                      {groupTasks.length}
                    </span>
                  </div>
                </div>

                {/* Group Items */}
                <div className="divide-y divide-[var(--color-border)]">
                  {groupTasks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                      {t('tasks.columnEmpty')}
                    </div>
                  ) : (
                    groupTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 hover:bg-[var(--color-surface-raised)] transition-colors duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        {/* Task Title & Details */}
                        <div
                          onClick={() => setActiveModalTask(task)}
                          className="flex-1 cursor-pointer min-w-0 pr-3"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <PriorityBadge priority={task.priority} />
                            <span className="text-[var(--color-text-muted)]">•</span>
                            <h4 className="text-sm font-semibold text-[var(--color-text)] group-hover:text-indigo-300 transition-colors truncate">
                              {task.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-muted)] flex-wrap">
                            {/* Assignee */}
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                              <span>{formatTaskAssignee(task.assignee_id)}</span>
                            </div>

                            {/* Deadline */}
                            {task.deadline && (
                              <div
                                className={`flex items-center gap-1.5 ${
                                  task.status !== 'DONE' && isOverdue(task.deadline, task.status)
                                    ? 'text-[var(--color-danger)] font-semibold'
                                    : ''
                                }`}
                              >
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{formatDate(task.deadline)}</span>
                              </div>
                            )}

                            {/* Checklist progress */}
                            {task.checklist && task.checklist.length > 0 && (
                              <div className="text-[11px] font-mono text-indigo-400">
                                {task.checklist.filter((c) => c.done).length}/{task.checklist.length}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Status Action Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {task.status !== 'DONE' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickStatusChange(task, 'DONE');
                              }}
                              className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400 font-medium transition-colors cursor-pointer"
                            >
                              {t('tasks.markDone')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveModalTask(task)}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                            aria-label={t('tasks.viewDetailAria', { title: task.title })}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal chi tiết Task */}
      {activeModalTask && (
        <TaskDetailModal
          task={activeModalTask}
          onClose={() => {
            setActiveModalTask(null);
            if (onClearSelectedTaskId) onClearSelectedTaskId();
          }}
          onUpdateTask={(updated) => {
            onUpdateTask(activeModalTask.id, updated);
            setActiveModalTask((prev) => (prev ? { ...prev, ...updated } : null));
          }}
          onDeleteTask={onDeleteTask}
          profileNames={profileNames}
        />
      )}

      {/* Modal Tạo Task Mới */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-task-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface)]">
              <h3 id="create-task-modal-title" className="text-base font-bold text-[var(--color-text)]">
                {t('tasks.modalCreateTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label={t('tasks.closeModalAria')}
                className="rounded-xl p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text)] block mb-1.5">
                  {t('tasks.formTitle')}
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t('tasks.formTitlePlaceholder')}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3.5 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-text)] block mb-1.5">
                  {t('tasks.formDescription')}
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t('tasks.formDescPlaceholder')}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text)] block mb-1.5">
                    {t('tasks.formInitialStatus')}
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
                  >
                    {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {t(`status.${st}` as TranslationKey)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-text)] block mb-1.5">
                    {t('tasks.formPriority')}
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
                  >
                    {(Object.keys(TASK_PRIORITY_CONFIG) as TaskPriority[]).map((pr) => (
                      <option key={pr} value={pr}>
                        {t(`priority.${pr}` as TranslationKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text)] block mb-1.5">
                    {t('tasks.formAssignee')}
                  </label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
                  >
                    <option value="">{t('assignee.unassigned')}</option>
                    {SLOT_IDS.map((slotId) => (
                      <option key={slotId} value={slotId}>
                        {profileNames[slotId]} ({slotId.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-text)] block mb-1.5">
                    {t('tasks.formDeadline')}
                  </label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newTitle.trim()}
                  icon={Plus}
                >
                  {t('tasks.formSubmit')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
