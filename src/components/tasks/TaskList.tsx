'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Filter,
  Kanban,
  Plus,
  Search,
  Table2,
  Timer,
  X,
  RotateCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldInput, FieldSelect, FieldTextarea, ToolbarSelect } from '@/components/common/form';

import TaskDetailModal from './TaskDetailModal';
import TaskTable from './views/task-table';
import TaskKanban from './views/task-kanban';
import TaskTimeline from './views/task-timeline';
import TaskCalendar from './views/task-calendar';
import { compareTasks, isTaskView, STATUS_ORDER, type TaskSort, type TaskView } from './task-view-utils';
import { ApiClientError, isStaleError } from '@/lib/api-client';
import { TASK_PRIORITY_CONFIG, TASK_TAGS } from '@/lib/constants';
import type { TaskTag } from '@/lib/constants';
import { useAppData } from '@/components/providers/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { useLocale } from '@/i18n/useLocale';
import type { TranslationKey } from '@/i18n/dictionaries/vi';
import type { TaskPriority, TaskStatus } from '@/types/database';

const VIEW_MODE_KEY = 'task_view_mode';

const VIEW_OPTIONS: { value: TaskView; labelKey: TranslationKey; icon: LucideIcon }[] = [
  { value: 'table', labelKey: 'tasks.viewTable', icon: Table2 },
  { value: 'kanban', labelKey: 'tasks.viewKanban', icon: Kanban },
  { value: 'timeline', labelKey: 'tasks.viewTimeline', icon: Timer },
  { value: 'calendar', labelKey: 'tasks.viewCalendar', icon: CalendarDays },
];

const PRIORITY_ORDER: TaskPriority[] = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];

function readStoredView(fallback: TaskView): TaskView {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return isTaskView(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

interface TaskListProps {
  selectedTaskId?: string;
  initialView?: TaskView;
  openCreate?: boolean;
}

export default function TaskList({ selectedTaskId, initialView, openCreate = false }: TaskListProps) {
  const { t } = useLocale();
  const { success, error } = useToast();
  const router = useRouter();
  const { tasks, members, session, can, createTask, updateTask, refresh } = useAppData();

  const [view, setView] = useState<TaskView>(() => (typeof window === 'undefined' ? initialView ?? 'table' : readStoredView(initialView ?? 'table')));
  const [filterAssignee, setFilterAssignee] = useState('ALL');
  const [filterTag, setFilterTag] = useState<'ALL' | TaskTag>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | TaskStatus>('ALL');
  const [sort, setSort] = useState<TaskSort>('deadline');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(openCreate);
  const [refreshing, setRefreshing] = useState(false);

  // Tự động kéo dữ liệu nếu danh sách đang rỗng
  React.useEffect(() => {
    if (session && tasks.length === 0) {
      void refresh().catch(() => undefined);
    }
  }, [session, tasks.length, refresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      success(t('tasks.statusUpdatedTitle'), 'Đã cập nhật danh sách công việc mới nhất.');
    } catch {
      error(t('tasks.statusUpdateFailed'), 'Không thể tải lại dữ liệu từ server.');
    } finally {
      setRefreshing(false);
    }
  };

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus>('TODO');
  const [newPriority, setNewPriority] = useState<TaskPriority>('NORMAL');
  const [newTag, setNewTag] = useState<TaskTag | ''>('');
  const [newAssigneeId, setNewAssigneeId] = useState(session?.userId ?? '');
  const [newDeadline, setNewDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  // Nút "Tạo task" trên header điều hướng tới /tasks?new=1. Đổi state ngay khi render
  // (không qua effect) theo pattern "adjusting state when props change" của React.
  const [createRequested, setCreateRequested] = useState(openCreate);
  if (openCreate !== createRequested) {
    setCreateRequested(openCreate);
    setShowCreateModal(openCreate);
  }

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) ?? null : null),
    [selectedTaskId, tasks]
  );

  const changeView = (next: TaskView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {
      // storage có thể bị chặn
    }
  };

  const filtersActive = filterAssignee !== 'ALL' || filterTag !== 'ALL' || filterStatus !== 'ALL' || !!searchQuery.trim();

  const visibleTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matched = tasks.filter((task) => {
      if (filterAssignee === 'MINE') {
        if (task.assignee_id !== session?.userId) return false;
      } else if (filterAssignee === 'UNASSIGNED') {
        if (task.assignee_id) return false;
      } else if (filterAssignee !== 'ALL' && task.assignee_id !== filterAssignee) {
        return false;
      }
      if (filterTag !== 'ALL' && task.tag !== filterTag) return false;
      if (filterStatus !== 'ALL' && task.status !== filterStatus) return false;
      if (query) {
        const inTitle = task.title.toLowerCase().includes(query);
        const inDescription = task.description?.toLowerCase().includes(query);
        if (!inTitle && !inDescription) return false;
      }
      return true;
    });

    if (sort === 'priority') {
      return matched.sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority) || compareTasks(a, b));
    }
    if (sort === 'updated') {
      return matched.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return matched.sort(compareTasks);
  }, [tasks, filterAssignee, filterTag, filterStatus, searchQuery, sort, session?.userId]);

  const openTask = (taskId: string) => router.push(`/tasks/${taskId}`);
  const closeTask = () => router.push('/tasks');

  const handleStatusChange = async (taskId: string, nextStatus: TaskStatus, title: string) => {
    try {
      await updateTask(taskId, { status: nextStatus });
      success(t('tasks.statusUpdatedTitle'), t('tasks.statusUpdatedMsg', { title, status: t(`status.${nextStatus}` as TranslationKey) }));
    } catch (err) {
      error(
        t('tasks.statusUpdateFailed'),
        isStaleError(err)
          ? t('tasks.staleReloadedMsg')
          : `${err instanceof ApiClientError ? t(`apiError.${err.code}` as TranslationKey) : t('apiError.system')} ${t('tasks.statusRollbackMsg')}`
      );
    }
  };

  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title || creating) return;

    setCreating(true);
    try {
      const created = await createTask({
        title,
        description: newDescription.trim() || null,
        status: newStatus,
        priority: newPriority,
        tag: newTag || null,
        assignee_id: newAssigneeId || null,
        deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
      });

      success(t('tasks.taskCreatedTitle'), t('tasks.taskCreatedMsg', { title: created.title }));
      setShowCreateModal(false);
      if (openCreate) router.replace('/tasks');
      setNewTitle('');
      setNewDescription('');
      setNewStatus('TODO');
      setNewPriority('NORMAL');
      setNewTag('');
      setNewAssigneeId(session?.userId ?? '');
      setNewDeadline('');
    } catch (err) {
      error(
        t('tasks.createFailedTitle'),
        err instanceof ApiClientError ? t(`apiError.${err.code}` as TranslationKey) : t('apiError.system')
      );
    } finally {
      setCreating(false);
    }
  };

  const clearFilters = () => {
    setFilterAssignee('ALL');
    setFilterTag('ALL');
    setFilterStatus('ALL');
    setSearchQuery('');
  };

  const viewProps = {
    tasks: visibleTasks,
    members,
    canEditTask: can.editTask,
    onOpenTask: openTask,
    onStatusChange: (taskId: string, status: TaskStatus, title: string) => void handleStatusChange(taskId, status, title),
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[var(--color-text)]">{t('nav.tasks')}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]">
            <span>{t('tasks.showingCount', { shown: visibleTasks.length, total: tasks.length })}</span>
            <span aria-hidden="true">·</span>
            <span>{t('tasks.dragHint')}</span>
          </p>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1" role="group" aria-label={t('tasks.viewAria')}>
          {VIEW_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = view === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => changeView(option.value)}
                aria-pressed={active}
                className={
                  active
                    ? 'inline-flex items-center gap-1.5 rounded-md bg-[var(--color-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-brand)] shadow-xs'
                    : 'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] cursor-pointer'
                }
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t(option.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[150px] max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('tasks.searchPlaceholder')}
            aria-label={t('tasks.searchAria')}
            className="h-8 pl-8 text-xs"
          />
        </div>

        {can.contribute && (
          <Button size="sm" onClick={() => setShowCreateModal(true)} className="order-2 shrink-0 lg:order-3">
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t('tasks.createTaskShort')}</span>
          </Button>
        )}

        <div className="order-3 grid w-full grid-cols-2 gap-2 md:grid-cols-4 lg:order-2 lg:flex lg:w-auto lg:flex-1">
          <ToolbarSelect
            value={filterAssignee}
            onChange={(event) => setFilterAssignee(event.target.value)}
            aria-label={t('tasks.filterAssigneeAria')}
            className="w-full min-w-0 lg:w-auto"
          >
            <option value="ALL">{t('tasks.allAssignees')}</option>
            <option value="MINE">{t('tasks.filterMine')}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.display_name}
              </option>
            ))}
            <option value="UNASSIGNED">{t('assignee.unassigned')}</option>
          </ToolbarSelect>

          <ToolbarSelect
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as 'ALL' | TaskStatus)}
            aria-label={t('tasks.filterStatusAria')}
            className="w-full min-w-0 lg:w-auto"
          >
            <option value="ALL">{t('tasks.allStatuses')}</option>
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {t(`status.${status}` as TranslationKey)}
              </option>
            ))}
          </ToolbarSelect>

          <ToolbarSelect
            value={filterTag}
            onChange={(event) => setFilterTag(event.target.value as 'ALL' | TaskTag)}
            aria-label={t('tasks.filterTagAria')}
            className="w-full min-w-0 lg:w-auto"
          >
            <option value="ALL">{t('tasks.allTags')}</option>
            {TASK_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {t(`tag.${tag}` as TranslationKey)}
              </option>
            ))}
          </ToolbarSelect>

          <ToolbarSelect
            value={sort}
            onChange={(event) => setSort(event.target.value as TaskSort)}
            aria-label={t('tasks.sortAria')}
            className="w-full min-w-0 lg:w-auto"
          >
            <option value="deadline">{t('tasks.sortDeadline')}</option>
            <option value="priority">{t('tasks.sortPriority')}</option>
            <option value="updated">{t('tasks.sortUpdated')}</option>
          </ToolbarSelect>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="order-5 shrink-0"
          title="Tải lại danh sách"
        >
          <RotateCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Làm mới</span>
        </Button>

        {filtersActive && (
          <Button type="button" variant="ghost" size="xs" onClick={clearFilters} className="order-4 lg:order-none">
            <X className="size-3.5" />
            {t('tasks.clearFilters')}
          </Button>
        )}
      </div>

      {/* Body */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={Filter}
          title={t('tasks.emptyTitle')}
          description={t('tasks.emptyDescription')}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
                <RotateCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Tải lại dữ liệu</span>
              </Button>
              {can.contribute && (
                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="size-4" />
                  {t('tasks.createTask')}
                </Button>
              )}
            </div>
          }
        />
      ) : visibleTasks.length === 0 ? (
        <EmptyState icon={Search} title={t('tasks.noMatchTitle')} description={t('tasks.clearFilters')} />
      ) : view === 'table' ? (
        <TaskTable {...viewProps} />
      ) : view === 'kanban' ? (
        <TaskKanban {...viewProps} />
      ) : view === 'timeline' ? (
        <TaskTimeline tasks={visibleTasks} members={members} />
      ) : (
        <TaskCalendar tasks={visibleTasks} onOpenTask={openTask} />
      )}

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={closeTask} />}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-xl gap-0 p-0">
          <DialogHeader className="border-b border-[var(--color-border)] px-5 py-4 text-left">
            <DialogTitle className="text-sm font-bold">{t('tasks.modalCreateTitle')}</DialogTitle>
            <DialogDescription className="text-xs">{t('tasks.formDescPlaceholder')}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 px-5 py-4">
            <FieldInput
              label={t('tasks.formTitle')}
              required
              maxLength={200}
              autoFocus
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder={t('tasks.formTitlePlaceholder')}
            />

            <FieldTextarea
              label={t('tasks.formDescription')}
              rows={3}
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder={t('tasks.formDescPlaceholder')}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FieldSelect
                label={t('tasks.formInitialStatus')}
                value={newStatus}
                onChange={(event) => setNewStatus(event.target.value as TaskStatus)}
                options={STATUS_ORDER.map((status) => ({ value: status, label: t(`status.${status}` as TranslationKey) }))}
              />
              <FieldSelect
                label={t('tasks.formPriority')}
                value={newPriority}
                onChange={(event) => setNewPriority(event.target.value as TaskPriority)}
                options={Object.keys(TASK_PRIORITY_CONFIG).map((priority) => ({
                  value: priority,
                  label: t(`priority.${priority}` as TranslationKey),
                }))}
              />
              <FieldSelect
                label={t('tasks.formTag')}
                value={newTag}
                onChange={(event) => setNewTag(event.target.value as TaskTag | '')}
                options={[
                  { value: '', label: t('tasks.noTag') },
                  ...TASK_TAGS.map((tag) => ({ value: tag, label: t(`tag.${tag}` as TranslationKey) })),
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldSelect
                label={t('tasks.formAssignee')}
                value={newAssigneeId}
                onChange={(event) => setNewAssigneeId(event.target.value)}
                options={[
                  { value: '', label: t('assignee.unassigned') },
                  ...members.map((member) => ({ value: member.id, label: member.display_name })),
                ]}
              />
              <FieldInput
                type="date"
                label={t('tasks.formDeadline')}
                value={newDeadline}
                onChange={(event) => setNewDeadline(event.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={!newTitle.trim() || creating}>
                <Plus className="size-4" />
                {t('tasks.formSubmit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

