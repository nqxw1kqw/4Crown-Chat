'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Paperclip,
  Clock,
  AlertCircle,
  Percent,
} from 'lucide-react';
import { Task, TaskChecklistItem, ProjectRole, Profile, TaskStatus, TaskPriority } from '@/types/database';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdateTask: (updated: Partial<Task>) => void;
  onDeleteTask?: (taskId: string) => void;
  members: { user_id: string; profile: Profile }[];
  currentUserId: string;
  userRole: ProjectRole;
}

export default function TaskDetailModal({
  task,
  onClose,
  onUpdateTask,
  onDeleteTask,
  members,
  currentUserId,
  userRole,
}: TaskDetailModalProps) {
  // Kiểm tra quyền chỉnh sửa theo Section 7:
  // VIEWER: cấm hoàn toàn.
  // MEMBER: chỉ sửa task mình được assign hoặc mình là người tạo.
  // OWNER / ADMIN: sửa mọi task.
  const canEdit =
    userRole === 'OWNER' ||
    userRole === 'ADMIN' ||
    (userRole === 'MEMBER' && (task.assignee_id === currentUserId || task.creator_id === currentUserId));

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assignee_id);
  const [progress, setProgress] = useState<number>(task.progress);
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(task.checklist || []);
  const [newChecklistLabel, setNewChecklistLabel] = useState('');

  // Toggle checklist item
  const handleToggleChecklist = (itemId: string) => {
    if (!canEdit) return;
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    setChecklist(updated);

    // Tự động tính toán tiến độ dựa trên số lượng checklist hoàn thành nếu muốn
    const doneCount = updated.filter((i) => i.done).length;
    const autoProgress = updated.length > 0 ? Math.round((doneCount / updated.length) * 100) : progress;
    setProgress(autoProgress);

    onUpdateTask({ checklist: updated, progress: autoProgress });
  };

  // Thêm checklist item
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !newChecklistLabel.trim()) return;

    const newItem: TaskChecklistItem = {
      id: `check-${Date.now()}`,
      task_id: task.id,
      label: newChecklistLabel.trim(),
      done: false,
      position: checklist.length,
      created_at: new Date().toISOString(),
    };

    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewChecklistLabel('');
    onUpdateTask({ checklist: updated });
  };

  // Xóa checklist item
  const handleDeleteChecklistItem = (itemId: string) => {
    if (!canEdit) return;
    const updated = checklist.filter((item) => item.id !== itemId);
    setChecklist(updated);
    onUpdateTask({ checklist: updated });
  };

  const handleSaveField = (field: keyof Task, val: unknown) => {
    if (!canEdit) return;
    onUpdateTask({ [field]: val });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-800 bg-[#12141e] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${TASK_STATUS_CONFIG[status].color}`}>
              {TASK_STATUS_CONFIG[status].label}
            </span>
            <span className={`text-xs font-semibold ${TASK_PRIORITY_CONFIG[priority].color}`}>
              {TASK_PRIORITY_CONFIG[priority].label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!canEdit && (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Chỉ xem (VIEWER)
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            {canEdit ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleSaveField('title', title)}
                className="w-full text-lg font-bold text-white bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="Tiêu đề task..."
              />
            ) : (
              <h2 className="text-lg font-bold text-white">{task.title}</h2>
            )}
          </div>

          {/* Quick Selectors: Status, Priority, Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Status Selector */}
            <div className="rounded-xl border border-zinc-800 bg-[#171924] p-3">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                Trạng thái
              </label>
              <select
                disabled={!canEdit}
                value={status}
                onChange={(e) => {
                  const newStatus = e.target.value as TaskStatus;
                  setStatus(newStatus);
                  handleSaveField('status', newStatus);
                }}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              >
                {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {TASK_STATUS_CONFIG[st].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selector */}
            <div className="rounded-xl border border-zinc-800 bg-[#171924] p-3">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                Độ ưu tiên
              </label>
              <select
                disabled={!canEdit}
                value={priority}
                onChange={(e) => {
                  const newPri = e.target.value as TaskPriority;
                  setPriority(newPri);
                  handleSaveField('priority', newPri);
                }}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              >
                {(Object.keys(TASK_PRIORITY_CONFIG) as TaskPriority[]).map((pri) => (
                  <option key={pri} value={pri}>
                    {TASK_PRIORITY_CONFIG[pri].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Selector */}
            <div className="rounded-xl border border-zinc-800 bg-[#171924] p-3">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                Người phụ trách
              </label>
              <select
                disabled={!canEdit}
                value={assigneeId || ''}
                onChange={(e) => {
                  const newAss = e.target.value || null;
                  setAssigneeId(newAss);
                  handleSaveField('assignee_id', newAss);
                }}
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
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

          {/* Progress Slider */}
          <div className="rounded-xl border border-zinc-800 bg-[#171924] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-indigo-400" /> Tiến độ hoàn thành
              </span>
              <span className="text-xs font-bold text-white font-mono">{progress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              disabled={!canEdit}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              onMouseUp={() => handleSaveField('progress', progress)}
              onTouchEnd={() => handleSaveField('progress', progress)}
              className="w-full accent-indigo-500 cursor-pointer disabled:cursor-not-allowed"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              Mô tả chi tiết
            </label>
            {canEdit ? (
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleSaveField('description', description)}
                placeholder="Ghi chú chi tiết yêu cầu kỹ thuật, tài nguyên hoặc mô tả bug..."
                className="w-full rounded-xl border border-zinc-800 bg-[#171924] p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            ) : (
              <p className="rounded-xl border border-zinc-800 bg-[#171924] p-3 text-sm text-zinc-300">
                {task.description || 'Không có mô tả.'}
              </p>
            )}
          </div>

          {/* Checklist (Section 6 & 8) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-emerald-400" />
                Checklist ({checklist.filter((c) => c.done).length}/{checklist.length})
              </h3>
            </div>

            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between group p-2.5 rounded-lg border border-zinc-800/60 bg-[#161923] hover:border-zinc-700"
                >
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleToggleChecklist(item.id)}
                    className="flex items-center gap-3 text-left flex-1"
                  >
                    {item.done ? (
                      <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-zinc-500 shrink-0" />
                    )}
                    <span className={`text-xs ${item.done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                      {item.label}
                    </span>
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add checklist input */}
            {canEdit && (
              <form onSubmit={handleAddChecklistItem} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newChecklistLabel}
                  onChange={(e) => setNewChecklistLabel(e.target.value)}
                  placeholder="Thêm mục việc cần làm..."
                  className="flex-1 rounded-lg border border-zinc-800 bg-[#171924] px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newChecklistLabel.trim()}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600/30 border border-indigo-500/40 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-600/50 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm
                </button>
              </form>
            )}
          </div>

          {/* Deadline & Meta */}
          <div className="flex flex-wrap items-center justify-between pt-4 border-t border-zinc-800/80 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-zinc-500" />
              <span>Hạn chót: {formatDate(task.deadline)}</span>
            </div>
            {canEdit && onDeleteTask && (userRole === 'OWNER' || userRole === 'ADMIN') && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bạn có chắc muốn xóa task này không?')) {
                    onDeleteTask(task.id);
                    onClose();
                  }
                }}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Xóa task
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
