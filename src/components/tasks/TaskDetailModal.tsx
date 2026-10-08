'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Percent,
} from 'lucide-react';
import { Task, TaskChecklistItem, TaskStatus, TaskPriority } from '@/types/database';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/lib/constants';
import { useLocale } from '@/i18n/useLocale';
import { TranslationKey } from '@/i18n/dictionaries/vi';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { SlotId, SLOT_IDS } from '@/lib/profile';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdateTask: (updated: Partial<Task>) => void;
  onDeleteTask?: (taskId: string) => void;
  profileNames: Record<SlotId, string>;
}

export default function TaskDetailModal({
  task,
  onClose,
  onUpdateTask,
  onDeleteTask,
  profileNames,
}: TaskDetailModalProps) {
  const { t, formatDate } = useLocale();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assignee_id);
  const [progress, setProgress] = useState<number>(task.progress);
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(task.checklist || []);
  const [newChecklistLabel, setNewChecklistLabel] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showDeleteConfirm) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showDeleteConfirm]);

  // Toggle checklist item
  const handleToggleChecklist = (itemId: string) => {
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    setChecklist(updated);

    const doneCount = updated.filter((i) => i.done).length;
    const autoProgress = updated.length > 0 ? Math.round((doneCount / updated.length) * 100) : progress;
    setProgress(autoProgress);

    onUpdateTask({ checklist: updated, progress: autoProgress });
  };

  // Thêm checklist item
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistLabel.trim()) return;

    const newItem: TaskChecklistItem = {
      id: `check-${crypto.randomUUID()}`,
      task_id: task.id,
      label: newChecklistLabel.trim(),
      done: false,
      position: checklist.length,
      created_at: new Date().toISOString(),
    };

    const updated = [...checklist, newItem];
    setChecklist(updated);

    const doneCount = updated.filter((i) => i.done).length;
    const autoProgress = Math.round((doneCount / updated.length) * 100);
    setProgress(autoProgress);

    onUpdateTask({ checklist: updated, progress: autoProgress });
    setNewChecklistLabel('');
  };

  // Xóa checklist item
  const handleDeleteChecklistItem = (itemId: string) => {
    const updated = checklist.filter((item) => item.id !== itemId);
    setChecklist(updated);

    const doneCount = updated.filter((i) => i.done).length;
    const autoProgress = updated.length > 0 ? Math.round((doneCount / updated.length) * 100) : 0;
    setProgress(autoProgress);

    onUpdateTask({ checklist: updated, progress: autoProgress });
  };

  // Lưu từng trường riêng lẻ
  const handleSaveField = (field: keyof Task, value: unknown) => {
    onUpdateTask({ [field]: value });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-modal-title"
    >
      <div className="relative w-full max-w-2xl flex flex-col max-h-[90vh] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface)]">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <PriorityBadge priority={priority} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('taskDetail.closeAria')}
            className="rounded-xl p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Title Input */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleSaveField('title', title)}
              aria-label={t('taskDetail.titlePlaceholder')}
              placeholder={t('taskDetail.titlePlaceholder')}
              className="w-full bg-transparent text-lg font-bold text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] rounded-lg px-2 py-1"
            />
          </div>

          {/* Grid Selectors: Status, Priority, Assignee (4 Slots) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Status */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                {t('taskDetail.statusLabel')}
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const newStat = e.target.value as TaskStatus;
                  setStatus(newStat);
                  handleSaveField('status', newStat);
                }}
                className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
              >
                {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {t(`status.${st}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                {t('taskDetail.priorityLabel')}
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  const newPri = e.target.value as TaskPriority;
                  setPriority(newPri);
                  handleSaveField('priority', newPri);
                }}
                className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
              >
                {(Object.keys(TASK_PRIORITY_CONFIG) as TaskPriority[]).map((pri) => (
                  <option key={pri} value={pri}>
                    {t(`priority.${pri}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Selector (4 Slots) */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                {t('taskDetail.assigneeLabel')}
              </label>
              <select
                value={assigneeId || ''}
                onChange={(e) => {
                  const newAss = e.target.value || null;
                  setAssigneeId(newAss);
                  handleSaveField('assignee_id', newAss);
                }}
                className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
              >
                <option value="">{t('assignee.unassigned')}</option>
                {SLOT_IDS.map((slotId) => (
                  <option key={slotId} value={slotId}>
                    {profileNames[slotId]} ({slotId.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Progress Slider */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-indigo-400" /> {t('taskDetail.progressLabel')}
              </span>
              <span className="text-xs font-bold text-[var(--color-text)] font-mono">{progress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              onMouseUp={() => handleSaveField('progress', progress)}
              onTouchEnd={() => handleSaveField('progress', progress)}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text)] block mb-2">
              {t('taskDetail.descriptionLabel')}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleSaveField('description', description)}
              placeholder={t('taskDetail.formDescPlaceholder')}
              className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
            />
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-emerald-400" />
                {t('taskDetail.checklistTitle', {
                  done: checklist.filter((c) => c.done).length,
                  total: checklist.length,
                })}
              </h3>
            </div>

            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)] transition-colors group"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleChecklist(item.id)}
                    className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                  >
                    {item.done ? (
                      <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                    )}
                    <span
                      className={`text-xs ${
                        item.done ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'
                      } truncate`}
                    >
                      {item.label}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    aria-label={t('common.delete')}
                    className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-rose-400 p-1 transition-opacity cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Checklist Item Form */}
            <form onSubmit={handleAddChecklistItem} className="flex gap-2">
              <input
                type="text"
                value={newChecklistLabel}
                onChange={(e) => setNewChecklistLabel(e.target.value)}
                placeholder={t('taskDetail.addChecklistPlaceholder')}
                className="flex-1 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newChecklistLabel.trim()}
                icon={Plus}
              >
                {t('taskDetail.addChecklistBtn')}
              </Button>
            </form>
          </div>

          {/* Deadline & Meta */}
          <div className="flex flex-wrap items-center justify-between pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{t('taskDetail.deadlineLabel', { date: formatDate(task.deadline) })}</span>
            </div>
            {onDeleteTask && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                icon={Trash2}
              >
                {t('taskDetail.deleteTask')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dialog xác nhận xóa task an toàn */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('taskDetail.deleteConfirmTitle')}
        description={t('taskDetail.deleteConfirmDesc')}
        targetName={`"${task.title}"`}
        confirmLabel={t('taskDetail.deleteConfirmBtn')}
        cancelLabel={t('common.cancel')}
        isDangerous={true}
        onConfirm={() => {
          if (onDeleteTask) {
            onDeleteTask(task.id);
            setShowDeleteConfirm(false);
            onClose();
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
