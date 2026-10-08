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
} from 'lucide-react';
import { Task, ProjectRole, Profile, TaskStatus, TaskPriority } from '@/types/database';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, DEFAULT_PROJECT_ID } from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';
import { canCreateTask, canEditTask, getRoleRestrictionMessage } from '@/lib/permissions';
import { useLocale } from '@/i18n/useLocale';
import { TranslationKey } from '@/i18n/dictionaries/vi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PriorityBadge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import TaskDetailModal from './TaskDetailModal';

interface TaskListProps {
  tasks: Task[];
  members: { user_id: string; profile: Profile }[];
  currentUserId: string;
  userRole: ProjectRole;
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
  members,
  currentUserId,
  userRole,
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
  const [newAssigneeId, setNewAssigneeId] = useState<string>('');
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

  const canCreate = canCreateTask(userRole);

  // Lọc task theo người phụ trách và từ khóa tìm kiếm
  const filteredTasks = tasks.filter((task) => {
    if (filterAssignee !== 'ALL' && task.assignee_id !== filterAssignee) {
      return false;
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

  // Kéo thả Kanban (Drag and Drop)
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

    if (!canEditTask(userRole, targetTask, currentUserId)) {
      error(t('tasks.noPermission'), getRoleRestrictionMessage(t('action.changeStatus'), userRole, t));
      return;
    }

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
      creator_id: currentUserId,
      progress: 0,
      deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
      checklist: [],
    });

    success(t('tasks.taskCreatedTitle'), t('tasks.taskCreatedMsg', { title: newTitle.trim() }));

    setNewTitle('');
    setNewDescription('');
    setNewStatus('TODO');
    setNewPriority('NORMAL');
    setNewAssigneeId('');
    setNewDeadline('');
    setShowCreateModal(false);
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

          {/* Assignee Filter */}
          <div className="relative">
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              aria-label={t('tasks.filterAssigneeAria')}
              className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
            >
              <option value="ALL">{t('tasks.allAssignees')}</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile.display_name}
                </option>
              ))}
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

        {/* Create Task Button */}
        <div className="shrink-0">
          {canCreate ? (
            <Button
              onClick={() => setShowCreateModal(true)}
              icon={Plus}
            >
              {t('tasks.createTask')}
            </Button>
          ) : (
            <Tooltip content={t('tasks.viewerNoCreate')}>
              <Button
                disabled
                icon={Plus}
              >
                {t('tasks.createTask')}
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Empty State Banner khi chưa có task nào */}
      {tasks.length === 0 && (
        <Card className="border-dashed p-8 text-center bg-[var(--color-surface)]/50">
          <ListTodo className="h-10 w-10 mx-auto text-indigo-400 mb-2 opacity-80" />
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('tasks.emptyTitle')}</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto leading-relaxed">
            {t('tasks.emptyDescription')}
          </p>
          {canCreate && (
            <div className="mt-4">
              <Button
                onClick={() => setShowCreateModal(true)}
                icon={Plus}
              >
                {t('tasks.createTaskButton')}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Chế độ Kanban */}
      {viewMode === 'kanban' && tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STATUS_GROUPS.map((group) => {
            const groupTasks = filteredTasks.filter((t) => t.status === group.status);
            const statusTitle = t(`status.${group.status}` as TranslationKey);

            return (
              <div
                key={group.status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, group.status)}
                className="flex flex-col min-w-[250px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] flex items-center justify-between">
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
                    groupTasks.map((task) => {
                      const assignee = members.find((m) => m.user_id === task.assignee_id)?.profile;
                      const editable = canEditTask(userRole, task, currentUserId);

                      return (
                        <div
                          key={task.id}
                          draggable={editable}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => setActiveModalTask(task)}
                          className={`p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)] cursor-pointer transition-all duration-150 shadow-sm ${
                            editable ? 'cursor-grab active:cursor-grabbing' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <PriorityBadge priority={task.priority} />
                            {editable && (
                              <GripVertical className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
                            )}
                          </div>

                          <h4 className="text-xs font-semibold text-[var(--color-text)] mt-1.5 line-clamp-2">
                            {task.title}
                          </h4>

                          <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                            <span className="truncate max-w-[100px]">
                              {assignee ? assignee.display_name : t('tasks.unassigned')}
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
                      );
                    })
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
                    groupTasks.map((task) => {
                      const assignee = members.find((m) => m.user_id === task.assignee_id)?.profile;
                      const editable = canEditTask(userRole, task, currentUserId);

                      return (
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
                                <span>{assignee ? assignee.display_name : t('tasks.unassigned')}</span>
                              </div>

                              {/* Deadline */}
                              {task.deadline && (
                                <div
                                  className={`flex items-center gap-1.5 ${
                                    task.status !== 'DONE' && isOverdue(task.deadline, task.status)
                                      ? 'text-[var(--color-danger)] font-semibold'
                                      : 'text-[var(--color-text-muted)]'
                                  }`}
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{formatDate(task.deadline)}</span>
                                </div>
                              )}

                              {/* Progress */}
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-indigo-500 h-1.5 rounded-full"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[11px]">{task.progress}%</span>
                              </div>

                              {/* Checklist count */}
                              {task.checklist && task.checklist.length > 0 && (
                                <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                                  {t('tasks.checklistCount', {
                                    done: task.checklist.filter((c) => c.done).length,
                                    total: task.checklist.length,
                                  })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Status Change Menu */}
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              disabled={!editable}
                              value={task.status}
                              aria-label={`${t('tasks.quickStatusChange')}: ${task.title}`}
                              title={
                                !editable
                                  ? getRoleRestrictionMessage(t('action.changeStatus'), userRole, t)
                                  : t('tasks.quickStatusChange')
                              }
                              onChange={(e) => {
                                handleQuickStatusChange(task, e.target.value as TaskStatus);
                              }}
                              className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50 cursor-pointer"
                            >
                              {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((st) => (
                                <option key={st} value={st}>
                                  {t(`status.${st}` as TranslationKey)}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => setActiveModalTask(task)}
                              className="p-1.5 rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                              aria-label={t('tasks.viewDetailAria', { title: task.title })}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
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
          members={members}
          currentUserId={currentUserId}
          userRole={userRole}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-task-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 id="create-task-modal-title" className="text-base font-bold text-[var(--color-text)] mb-4">
              {t('tasks.modalCreateTitle')}
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
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
                <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
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
                  <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
                    {t('tasks.formPriority')}
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
                  >
                    {(Object.keys(TASK_PRIORITY_CONFIG) as TaskPriority[]).map((pri) => (
                      <option key={pri} value={pri}>
                        {t(`priority.${pri}` as TranslationKey)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
                    {t('tasks.formAssignee')}
                  </label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
                  >
                    <option value="">{t('tasks.unassigned')}</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profile.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
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
                  <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
                    {t('tasks.formDeadline')}
                  </label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  {t('tasks.formCancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
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
