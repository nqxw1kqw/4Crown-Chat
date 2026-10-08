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
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/lib/constants';
import { formatDate, isOverdue } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { canCreateTask, canEditTask, getRoleRestrictionMessage } from '@/lib/permissions';
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

const STATUS_GROUPS: { status: TaskStatus; title: string; countColor: string }[] = [
  { status: 'TODO', title: 'Cần làm (TODO)', countColor: 'text-zinc-400 bg-zinc-800' },
  { status: 'IN_PROGRESS', title: 'Đang làm (IN_PROGRESS)', countColor: 'text-blue-400 bg-blue-500/10' },
  { status: 'REVIEW', title: 'Chờ duyệt (REVIEW)', countColor: 'text-amber-400 bg-amber-500/10' },
  { status: 'DONE', title: 'Hoàn tất (DONE)', countColor: 'text-emerald-400 bg-emerald-500/10' },
  { status: 'BLOCKED', title: 'Bị nghẽn (BLOCKED)', countColor: 'text-rose-400 bg-rose-500/10' },
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
  const handleQuickStatusChange = (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;
    const oldStatus = task.status;
    try {
      onUpdateTask(task.id, { status: newStatus });
      success(
        'Đã cập nhật trạng thái',
        `"${task.title}" chuyển sang ${TASK_STATUS_CONFIG[newStatus].label}`
      );
    } catch {
      onUpdateTask(task.id, { status: oldStatus });
      error('Cập nhật thất bại', 'Đã khôi phục lại trạng thái trước đó.');
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
      error('Không đủ quyền', getRoleRestrictionMessage('chuyển trạng thái task này', userRole));
      return;
    }

    handleQuickStatusChange(targetTask, targetStatus);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onCreateTask({
      project_id: tasks[0]?.project_id || 'proj-1',
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

    success('Tạo task thành công', `Đã thêm task "${newTitle.trim()}"`);

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
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm task..."
              aria-label="Tìm kiếm task"
              className="w-full rounded-xl border border-zinc-800 bg-[#12141e] pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Assignee Filter */}
          <div className="relative">
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              aria-label="Lọc theo người phụ trách"
              className="rounded-xl border border-zinc-800 bg-[#12141e] px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Tất cả người phụ trách</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Chế độ hiển thị Danh sách / Kanban */}
          <div className="flex items-center bg-[#12141e] border border-zinc-800 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => handleToggleViewMode('list')}
              aria-label="Chế độ hiển thị danh sách"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>Danh sách</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('kanban')}
              aria-label="Chế độ hiển thị bảng Kanban"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
          </div>
        </div>

        {/* Create Task Button */}
        <div className="shrink-0">
          {canCreate ? (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4" /> Tạo Task Mới
            </button>
          ) : (
            <div
              title={getRoleRestrictionMessage('tạo task', userRole)}
              className="text-xs text-zinc-400 italic py-2 px-3 border border-zinc-800 rounded-xl bg-[#12141d] text-center"
            >
              Vai trò VIEWER không có quyền tạo task
            </div>
          )}
        </div>
      </div>

      {/* Empty State Banner khi chưa có task nào */}
      {tasks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#12141d]/60 p-8 text-center">
          <ListTodo className="h-10 w-10 mx-auto text-indigo-400 mb-2 opacity-80" />
          <h3 className="text-sm font-semibold text-zinc-200">Dự án hiện chưa có task nào</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Bắt đầu lên danh sách công việc cho team phát triển game bằng cách tạo task đầu tiên nhé.
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4" /> Bắt đầu tạo task
            </button>
          )}
        </div>
      )}

      {/* Chế độ Kanban */}
      {viewMode === 'kanban' && tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STATUS_GROUPS.map((group) => {
            const groupTasks = filteredTasks.filter((t) => t.status === group.status);
            return (
              <div
                key={group.status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, group.status)}
                className="flex flex-col min-w-[250px] rounded-2xl border border-[#1f2330] bg-[#12141d] overflow-hidden"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-zinc-800/80 bg-[#141722] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      {group.status}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${group.countColor}`}>
                      {groupTasks.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-3 flex-1 space-y-3 min-h-[300px]">
                  {groupTasks.length === 0 ? (
                    <div className="h-32 border border-dashed border-zinc-800/60 rounded-xl flex items-center justify-center text-xs text-zinc-500 text-center p-3">
                      Kéo thả task vào đây
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
                          className={`p-3.5 rounded-xl border border-zinc-800 bg-[#161924] hover:border-zinc-700 hover:bg-[#1a1d2b] cursor-pointer transition-all shadow-sm ${
                            editable ? 'cursor-grab active:cursor-grabbing' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-[10px] font-bold ${TASK_PRIORITY_CONFIG[task.priority].color}`}>
                              ● {TASK_PRIORITY_CONFIG[task.priority].label}
                            </span>
                            {editable && (
                              <GripVertical className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                            )}
                          </div>

                          <h4 className="text-xs font-semibold text-zinc-200 mt-1.5 line-clamp-2">
                            {task.title}
                          </h4>

                          <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                            <span className="truncate max-w-[100px]">
                              {assignee ? assignee.display_name : 'Chưa gán'}
                            </span>
                            {task.deadline && (
                              <span
                                className={
                                  task.status !== 'DONE' && isOverdue(task.deadline)
                                    ? 'text-rose-400 font-semibold'
                                    : 'text-zinc-400'
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
            return (
              <div
                key={group.status}
                className="rounded-2xl border border-[#1f2330] bg-[#12141d] overflow-hidden shadow-sm"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-[#141722]">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      {group.title}
                    </h3>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${group.countColor}`}>
                      {groupTasks.length}
                    </span>
                  </div>
                </div>

                {/* Group Items */}
                <div className="divide-y divide-zinc-800/50">
                  {groupTasks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-400">
                      Chưa có công việc trong mục này.
                    </div>
                  ) : (
                    groupTasks.map((task) => {
                      const assignee = members.find((m) => m.user_id === task.assignee_id)?.profile;
                      const editable = canEditTask(userRole, task, currentUserId);

                      return (
                        <div
                          key={task.id}
                          className="p-4 hover:bg-[#161924] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          {/* Task Title & Details */}
                          <div
                            onClick={() => setActiveModalTask(task)}
                            className="flex-1 cursor-pointer min-w-0 pr-3"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[11px] font-bold ${TASK_PRIORITY_CONFIG[task.priority].color}`}>
                                ● {TASK_PRIORITY_CONFIG[task.priority].label}
                              </span>
                              <span className="text-zinc-500">•</span>
                              <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors truncate">
                                {task.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400 flex-wrap">
                              {/* Assignee */}
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-zinc-500" />
                                <span>{assignee ? assignee.display_name : 'Chưa gán'}</span>
                              </div>

                              {/* Deadline */}
                              {task.deadline && (
                                <div
                                  className={`flex items-center gap-1.5 ${
                                    task.status !== 'DONE' && isOverdue(task.deadline)
                                      ? 'text-rose-400 font-semibold'
                                      : 'text-zinc-400'
                                  }`}
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{formatDate(task.deadline)}</span>
                                </div>
                              )}

                              {/* Progress */}
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-indigo-500 h-1.5 rounded-full"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[11px]">{task.progress}%</span>
                              </div>

                              {/* Checklist count */}
                              {task.checklist && task.checklist.length > 0 && (
                                <span className="text-[11px] text-zinc-400 font-medium">
                                  ({task.checklist.filter((c) => c.done).length}/{task.checklist.length} checklist)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Status Change Menu */}
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              disabled={!editable}
                              value={task.status}
                              aria-label={`Thay đổi trạng thái cho task ${task.title}`}
                              title={
                                !editable
                                  ? getRoleRestrictionMessage('thay đổi trạng thái task này', userRole)
                                  : 'Thay đổi trạng thái nhanh'
                              }
                              onChange={(e) => {
                                handleQuickStatusChange(task, e.target.value as TaskStatus);
                              }}
                              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 disabled:opacity-50 cursor-pointer"
                            >
                              {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((st) => (
                                <option key={st} value={st}>
                                  {TASK_STATUS_CONFIG[st].label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => setActiveModalTask(task)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                              aria-label={`Xem chi tiết task ${task.title}`}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
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
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#12141e] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 id="create-task-modal-title" className="text-base font-bold text-white mb-4">
              Tạo Task Mới
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Tiêu đề *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Tối ưu hoá shader nước, Vẽ icon trang bị..."
                  className="w-full rounded-xl border border-zinc-800 bg-[#171924] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Yêu cầu cụ thể của công việc..."
                  className="w-full rounded-xl border border-zinc-800 bg-[#171924] p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Độ ưu tiên</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-xl border border-zinc-800 bg-[#171924] px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {(Object.keys(TASK_PRIORITY_CONFIG) as TaskPriority[]).map((pri) => (
                      <option key={pri} value={pri}>
                        {TASK_PRIORITY_CONFIG[pri].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Người phụ trách</label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-[#171924] px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Chưa gán</option>
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
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Trạng thái khởi tạo</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                    className="w-full rounded-xl border border-zinc-800 bg-[#171924] px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {TASK_STATUS_CONFIG[st].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Hạn chót (Deadline)</label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-[#171924] px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
                >
                  Tạo Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
