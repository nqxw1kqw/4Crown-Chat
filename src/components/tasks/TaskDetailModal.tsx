'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Calendar,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Percent,
  History,
  Paperclip,
  Link2,
  Link2Off,
  Download,
  Upload,
  Loader2,
  Send,
  MoreVertical,
  User,
  Film,
  FileArchive,
} from 'lucide-react';
import type {
  FileRecord,
  GameplayVideo,
  Task,
  TaskActivity,
  TaskChecklistItem,
  TaskComment,
  TaskPriority,
  TaskStatus,
} from '@/types/database';
import {
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_TAGS,
  type TaskTag,
} from '@/lib/constants';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { uploadLargeFileToR2, validateUploadFile } from '@/lib/upload/client-uploader';
import { useAppData } from '@/components/providers/AppDataProvider';
import { useLocale } from '@/i18n/useLocale';
import { TranslationKey } from '@/i18n/dictionaries/vi';
import { cn } from '@/lib/utils';
import { StatusBadge, PriorityBadge, TagBadge } from '@/components/common/badges';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FieldSelect, FieldTextarea } from '@/components/common/form';
import ConfirmDialog from '@/components/common/confirm-dialog';
import MemberAvatar from '@/components/common/member-avatar';
import { useToast } from '@/components/ui/Toast';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

type Tab = 'detail' | 'activity' | 'files';

interface TaskDetailResponse {
  task: Task;
  comments: TaskComment[];
  activity: TaskActivity[];
  files: FileRecord[];
  videos: GameplayVideo[];
}

type FeedItem =
  | { kind: 'comment'; at: number; comment: TaskComment }
  | { kind: 'activity'; at: number; entry: TaskActivity };

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.webm'];
const BUILD_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.apk', '.exe'];
const PROGRESS_MILESTONES = [0, 25, 50, 75, 100];

export default function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const { t, locale, formatDate, formatBytes } = useLocale();
  const intlLocale = locale === 'ja' ? 'ja-JP' : 'vi-VN';
  const {
    session,
    can,
    members,
    memberName,
    files: allFiles,
    videos: allVideos,
    updateTask,
    deleteTask,
    saveChecklist,
    addComment,
    deleteComment,
    linkFileToTask,
    linkVideoToTask,
    refresh,
  } = useAppData();
  const { success, error: toastError } = useToast();

  const [tab, setTab] = useState<Tab>('detail');
  const [detail, setDetail] = useState<TaskDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [newChecklistLabel, setNewChecklistLabel] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [busyAttachment, setBusyAttachment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reloadToken, setReloadToken] = useState(0);

  const reloadDetail = useCallback((showSpinner = false) => {
    if (showSpinner) setLoadingDetail(true);
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await apiFetch<TaskDetailResponse>(`/api/tasks/${task.id}`);
        if (cancelled) return;
        setDetail(payload);
        setLoadError(false);
      } catch {
        if (cancelled) return;
        setLoadError(true);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [task.id, reloadToken]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !showDeleteConfirm) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showDeleteConfirm]);

  const checklist: TaskChecklistItem[] = detail?.task.checklist ?? task.checklist ?? [];
  const attachedFiles = detail?.files ?? [];
  const attachedVideos = detail?.videos ?? [];

  const canEdit = can.editTask(task);
  const canDelete = can.deleteTask(task);

  const saveField = async (patch: Partial<Task>) => {
    try {
      await updateTask(task.id, patch);
    } catch (err) {
      toastError(
        t('taskDetail.saveFailedTitle'),
        err instanceof ApiClientError ? t(`apiError.${err.code}` as TranslationKey) : t('apiError.system')
      );
    }
  };

  const handleChecklistChange = async (next: { label: string; done: boolean }[]) => {
    setSavingChecklist(true);
    try {
      await saveChecklist(task.id, next);
      // Danh sách hiển thị lấy từ detail, phải refetch thì item mới xuất hiện.
      reloadDetail();
    } catch {
      toastError(t('taskDetail.saveFailedTitle'), t('apiError.system'));
    } finally {
      setSavingChecklist(false);
    }
  };

  const toggleChecklistItem = (itemId: string) => {
    void handleChecklistChange(
      checklist.map((item) =>
        item.id === itemId ? { label: item.label, done: !item.done } : { label: item.label, done: item.done }
      )
    );
  };

  const removeChecklistItem = (itemId: string) => {
    void handleChecklistChange(
      checklist.filter((item) => item.id !== itemId).map((item) => ({ label: item.label, done: item.done }))
    );
  };

  const submitChecklistItem = (event: React.FormEvent) => {
    event.preventDefault();
    const label = newChecklistLabel.trim();
    if (!label || savingChecklist) return;
    void handleChecklistChange([
      ...checklist.map((item) => ({ label: item.label, done: item.done })),
      { label, done: false },
    ]);
    setNewChecklistLabel('');
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = commentDraft.trim();
    if (!body || sendingComment) return;

    setSendingComment(true);
    try {
      await addComment(task.id, body);
      setCommentDraft('');
      reloadDetail();
    } catch (err) {
      toastError(
        t('comments.postFailedTitle'),
        err instanceof ApiClientError ? t(`apiError.${err.code}` as TranslationKey) : t('apiError.system')
      );
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(task.id, commentId);
      reloadDetail();
    } catch {
      toastError(t('comments.deleteFailedTitle'), t('apiError.system'));
    }
  };

  const unlinkedFiles = allFiles.filter((file) => !file.linked_task_id);
  const unlinkedVideos = allVideos.filter((video) => !video.linked_task_id);

  const handleAttachExisting = async (kind: 'file' | 'video', id: string) => {
    if (busyAttachment) return;
    setBusyAttachment(`${kind}:${id}`);
    try {
      if (kind === 'file') await linkFileToTask(id, task.id);
      else await linkVideoToTask(id, task.id);
      await refresh();
      reloadDetail();
      success(t('attachments.linkedTitle'), t('attachments.linkedMsg'));
    } catch {
      toastError(t('attachments.linkFailedTitle'), t('apiError.system'));
    } finally {
      setBusyAttachment(null);
    }
  };

  const handleDetach = async (kind: 'file' | 'video', id: string) => {
    if (busyAttachment) return;
    setBusyAttachment(`${kind}:${id}`);
    try {
      if (kind === 'file') await linkFileToTask(id, null);
      else await linkVideoToTask(id, null);
      await refresh();
      reloadDetail();
    } catch {
      toastError(t('attachments.linkFailedTitle'), t('apiError.system'));
    } finally {
      setBusyAttachment(null);
    }
  };

  const handleUploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploading) return;

    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const kind = VIDEO_EXTENSIONS.includes(extension)
      ? 'video'
      : BUILD_EXTENSIONS.includes(extension)
        ? 'build'
        : 'file';

    const validation = validateUploadFile(file, kind);
    if (!validation.valid) {
      toastError(
        t('attachments.uploadFailedTitle'),
        t(`upload.error.${validation.code}` as TranslationKey, validation.params)
      );
      return;
    }

    setUploading(true);
    setUploadPercent(0);
    try {
      await uploadLargeFileToR2({
        file,
        kind,
        extraMetadata: {
          linkedTaskId: task.id,
          folder: kind === 'build' ? 'builds' : 'general',
          title: file.name.replace(/\.[^/.]+$/, ''),
        },
        onProgress: (progress) => setUploadPercent(progress.percentage),
      });
      await refresh();
      reloadDetail();
      success(t('attachments.uploadedTitle'), t('attachments.uploadedMsg', { name: file.name }));
    } catch (err) {
      toastError(
        t('attachments.uploadFailedTitle'),
        err instanceof Error ? err.message : t('apiError.system')
      );
    } finally {
      setUploading(false);
      setUploadPercent(0);
    }
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      const data = await apiFetch<{ downloadUrl: string }>(`/api/files/${file.id}/download`);
      window.open(data.downloadUrl, '_blank', 'noopener');
    } catch {
      toastError(t('files.downloadFailedTitle'), t('apiError.system'));
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/tasks/${task.id}`);
      success(t('taskDetail.linkCopiedTitle'), t('taskDetail.linkCopiedMsg'));
    } catch {
      toastError(t('taskDetail.linkCopiedTitle'), t('taskDetail.linkCopyFailedMsg'));
    }
  };

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...(detail?.comments ?? []).map((comment) => ({
        kind: 'comment' as const,
        at: Date.parse(comment.created_at),
        comment,
      })),
      ...(detail?.activity ?? []).map((entry) => ({
        kind: 'activity' as const,
        at: Date.parse(entry.created_at),
        entry,
      })),
    ];
    return items.sort((a, b) => a.at - b.at);
  }, [detail]);

  // Gom feed theo ngày dương lịch để dựng timeline kiểu GitHub.
  const feedByDay = useMemo(() => {
    const groups: { key: string; label: string; items: FeedItem[] }[] = [];
    for (const item of feed) {
      const date = new Date(item.at);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const current = groups[groups.length - 1];
      if (current && current.key === key) current.items.push(item);
      else groups.push({ key, label: formatDate(date.toISOString()), items: [item] });
    }
    return groups;
  }, [feed, formatDate]);

  const formatTime = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)),
    [intlLocale]
  );

  const describeActivity = (entry: TaskActivity): string => {
    const actor = memberName(entry.actor_id) ?? t('assignee.unknown');
    switch (entry.action) {
      case 'created':
        return t('activity.created', { actor });
      case 'status_changed':
        return t('activity.statusChanged', {
          actor,
          from: t(`status.${entry.from_value}` as TranslationKey),
          to: t(`status.${entry.to_value}` as TranslationKey),
        });
      case 'assignee_changed':
        return t('activity.assigneeChanged', {
          actor,
          from: memberName(entry.from_value) ?? t('assignee.unassigned'),
          to: memberName(entry.to_value) ?? t('assignee.unassigned'),
        });
      case 'commented':
        return t('activity.commented', { actor });
      case 'attached':
        return t('activity.attached', { actor, name: entry.to_value ?? '' });
      case 'detached':
        return t('activity.detached', { actor, name: entry.from_value ?? '' });
      case 'checklist':
        return t('activity.checklist', { actor, from: entry.from_value ?? '0', to: entry.to_value ?? '0' });
      default:
        return t('activity.updated', {
          actor,
          field: t(`field.${entry.field ?? 'title'}` as TranslationKey),
        });
    }
  };

  const slotOf = (userId?: string | null) => members.find((member) => member.id === userId)?.slot;

  const tabs: { id: Tab; label: string; short?: string; icon: typeof CheckSquare; count?: number }[] = [
    { id: 'detail', label: t('taskDetail.tabDetail'), icon: CheckSquare },
    {
      id: 'activity',
      label: t('taskDetail.tabActivity'),
      short: t('taskDetail.tabActivityShort'),
      icon: History,
      count: feed.length,
    },
    {
      id: 'files',
      label: t('taskDetail.tabFiles'),
      icon: Paperclip,
      count: attachedFiles.length + attachedVideos.length,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/45 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-modal-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <TagBadge tag={task.tag} />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label={t('taskDetail.copyLinkAria')}
              title={t('taskDetail.copyLinkAria')}
              className="cursor-pointer rounded-md p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-brand-hover)]"
            >
              <Link2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('taskDetail.closeAria')}
              className="cursor-pointer rounded-md p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as Tab)}
          className="min-h-0 flex-1 gap-0"
        >
          <TabsList
            variant="line"
            className="h-auto w-full justify-start overflow-x-auto rounded-none border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className={cn(
                    'flex-none gap-1.5 rounded-none px-2.5 py-2.5 text-xs font-medium text-[var(--color-text-muted)] after:content-none! sm:px-3',
                    'data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[var(--color-brand-hover)]!'
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.short ? (
                    <>
                      <span className="hidden sm:inline">{item.label}</span>
                      <span className="sm:hidden">{item.short}</span>
                    </>
                  ) : (
                    item.label
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-1.5 font-mono text-[10px]">
                      {item.count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <TabsContent value="detail" className="mt-0 space-y-6">
              <input
                id="task-detail-modal-title"
                type="text"
                value={title}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => {
                  if (title.trim() && title.trim() !== task.title) void saveField({ title: title.trim() });
                }}
                aria-label={t('taskDetail.titlePlaceholder')}
                placeholder={t('taskDetail.titlePlaceholder')}
                disabled={!canEdit}
                className="w-full rounded-md bg-transparent px-2 py-1 text-[15px] font-semibold text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-brand)] focus:outline-none disabled:cursor-default"
              />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FieldSelect
                  label={t('taskDetail.statusLabel')}
                  value={task.status}
                  disabled={!canEdit}
                  onChange={(event) => void saveField({ status: event.target.value as TaskStatus })}
                >
                  {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {t(`status.${status}` as TranslationKey)}
                    </option>
                  ))}
                </FieldSelect>

                <FieldSelect
                  label={t('taskDetail.priorityLabel')}
                  value={task.priority}
                  disabled={!canEdit}
                  onChange={(event) => void saveField({ priority: event.target.value as TaskPriority })}
                >
                  {(Object.keys(TASK_PRIORITY_CONFIG) as TaskPriority[]).map((priority) => (
                    <option key={priority} value={priority}>
                      {t(`priority.${priority}` as TranslationKey)}
                    </option>
                  ))}
                </FieldSelect>

                <FieldSelect
                  label={t('taskDetail.assigneeLabel')}
                  value={task.assignee_id ?? ''}
                  disabled={!canEdit}
                  onChange={(event) => void saveField({ assignee_id: event.target.value || null })}
                >
                  <option value="">{t('assignee.unassigned')}</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.display_name} ({member.slot.toUpperCase()})
                    </option>
                  ))}
                </FieldSelect>

                <FieldSelect
                  label={t('taskDetail.tagLabel')}
                  value={task.tag ?? ''}
                  disabled={!canEdit}
                  onChange={(event) => void saveField({ tag: (event.target.value || null) as TaskTag | null })}
                >
                  <option value="">{t('tasks.noTag')}</option>
                  {TASK_TAGS.map((tag) => (
                    <option key={tag} value={tag}>
                      {t(`tag.${tag}` as TranslationKey)}
                    </option>
                  ))}
                </FieldSelect>
              </div>

              <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text)]">
                    <Percent className="size-3.5 text-[var(--color-brand)]" /> {t('taskDetail.progressLabel')}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[var(--color-brand-hover)]">{task.progress}%</span>
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('taskDetail.progressLabel')}>
                  {PROGRESS_MILESTONES.map((milestone) => {
                    const selected = task.progress === milestone;
                    return (
                      <button
                        key={milestone}
                        type="button"
                        onClick={() => void saveField({ progress: milestone })}
                        disabled={!canEdit}
                        aria-label={`${t('taskDetail.progressLabel')}: ${milestone}%`}
                        aria-pressed={selected}
                        className={cn(
                          'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 disabled:cursor-default',
                          selected
                            ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-white'
                            : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] enabled:hover:border-[var(--color-brand)] enabled:hover:text-[var(--color-brand-hover)]'
                        )}
                      >
                        {selected ? <CheckSquare className="size-3.5" aria-hidden="true" /> : <Square className="size-3.5" aria-hidden="true" />}
                        {milestone}%
                      </button>
                    );
                  })}
                </div>
              </div>

              <FieldTextarea
                label={t('taskDetail.descriptionLabel')}
                rows={3}
                value={description}
                disabled={!canEdit}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={() => {
                  if (description !== (task.description ?? '')) void saveField({ description });
                }}
                placeholder={t('taskDetail.formDescPlaceholder')}
              />

              <div className="space-y-3">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[var(--color-text)] uppercase">
                  <CheckSquare className="size-4 text-[var(--color-success-text)]" />
                  {t('taskDetail.checklistTitle', {
                    done: checklist.filter((item) => item.done).length,
                    total: checklist.length,
                  })}
                </h3>

                <div className="space-y-2">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => toggleChecklistItem(item.id)}
                        disabled={savingChecklist || !canEdit}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left disabled:cursor-default disabled:opacity-60"
                      >
                        {item.done ? (
                          <CheckSquare className="size-4 shrink-0 text-[var(--color-success-text)]" />
                        ) : (
                          <Square className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                        )}
                        <span
                          className={`truncate text-xs ${
                            item.done
                              ? 'text-[var(--color-text-muted)] line-through'
                              : 'text-[var(--color-text)]'
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(item.id)}
                        aria-label={t('common.delete')}
                        disabled={savingChecklist || !canEdit}
                        className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-danger)] disabled:cursor-default"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={submitChecklistItem} className="flex gap-2">
                  <Input
                    type="text"
                    value={newChecklistLabel}
                    maxLength={300}
                    disabled={!canEdit}
                    onChange={(event) => setNewChecklistLabel(event.target.value)}
                    placeholder={t('taskDetail.addChecklistPlaceholder')}
                    aria-label={t('taskDetail.addChecklistPlaceholder')}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newChecklistLabel.trim() || savingChecklist || !canEdit}
                    className="shrink-0"
                  >
                    {savingChecklist ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {t('taskDetail.addChecklistBtn')}
                  </Button>
                </form>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-4" />
                    {t('taskDetail.deadlineLabel', { date: formatDate(task.deadline) })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MemberAvatar slot={slotOf(task.creator_id)} name={memberName(task.creator_id)} size="xs" />
                    {t('taskDetail.creatorLabel', { name: memberName(task.creator_id) ?? t('assignee.unknown') })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {task.assignee_id ? (
                      <MemberAvatar slot={slotOf(task.assignee_id)} name={memberName(task.assignee_id)} size="xs" />
                    ) : (
                      <User className="size-5 text-[var(--color-text-muted)]" />
                    )}
                    {memberName(task.assignee_id) ?? t('assignee.unassigned')}
                  </span>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={!canDelete}>
                  <Trash2 className="size-4" />
                  {t('taskDetail.deleteTask')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <div className="space-y-4">
                {loadingDetail ? (
                  <LoadingRow label={t('common.loading')} />
                ) : loadError ? (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <p className="text-xs text-[var(--color-danger)]">{t('taskDetail.loadFailed')}</p>
                    <Button size="sm" variant="secondary" onClick={() => reloadDetail(true)}>
                      {t('boot.errorRetry')}
                    </Button>
                  </div>
                ) : feed.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">{t('activity.empty')}</p>
                ) : (
                  <ScrollArea className="h-[45vh] pr-3">
                    <div className="space-y-5">
                      {feedByDay.map((group) => (
                        <section key={group.key}>
                          <h4 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                            <span>{group.label}</span>
                            <span className="h-px flex-1 bg-[var(--color-border)]" aria-hidden="true" />
                          </h4>

                          <ol>
                            {group.items.map((item, index) => {
                              const actorId =
                                item.kind === 'comment' ? item.comment.author_id : item.entry.actor_id;
                              const last = index === group.items.length - 1;

                              return (
                                <li key={`${item.kind}-${item.kind === 'comment' ? item.comment.id : item.entry.id}`}>
                                  <div className="flex gap-2.5">
                                    <div className="relative shrink-0 self-stretch">
                                      <MemberAvatar
                                        slot={slotOf(actorId)}
                                        name={memberName(actorId)}
                                        size="sm"
                                        tooltip
                                      />
                                      {!last && (
                                        <span
                                          aria-hidden="true"
                                          className="absolute left-1/2 top-7 bottom-0 -translate-x-1/2 w-px bg-[var(--color-border)]"
                                        />
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1 pb-4">
                                      {item.kind === 'comment' ? (
                                        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                                          <div className="mb-1 flex items-center justify-between gap-2">
                                            <span className="truncate text-xs font-semibold text-[var(--color-text)]">
                                              {memberName(item.comment.author_id) ?? t('assignee.unknown')}
                                            </span>
                                            <div className="flex shrink-0 items-center gap-2">
                                              <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                                                {formatTime(item.comment.created_at)}
                                              </span>
                                              {(item.comment.author_id === session?.userId || can.manageTeam) && (
                                                <button
                                                  type="button"
                                                  onClick={() => void handleDeleteComment(item.comment.id)}
                                                  aria-label={t('comments.deleteAria')}
                                                  className="cursor-pointer text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-danger)] focus-visible:opacity-100"
                                                >
                                                  <Trash2 className="size-3.5" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          <p className="text-xs break-words whitespace-pre-wrap text-[var(--color-text)]">
                                            {item.comment.body}
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap items-baseline gap-x-2 py-1">
                                          <span className="text-xs text-[var(--color-text-muted)]">
                                            {describeActivity(item.entry)}
                                          </span>
                                          <span className="font-mono text-[11px] text-[var(--color-text-muted)] opacity-70">
                                            {formatTime(item.entry.created_at)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </section>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <form onSubmit={submitComment} className="flex gap-2 border-t border-[var(--color-border)] pt-2">
                  <Input
                    type="text"
                    value={commentDraft}
                    maxLength={5000}
                    disabled={!can.contribute}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder={t('comments.placeholder')}
                    aria-label={t('comments.placeholder')}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!commentDraft.trim() || sendingComment || !can.contribute}
                  >
                    {sendingComment ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {t('comments.submit')}
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="files" className="mt-0">
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-[var(--color-text-muted)]">{t('attachments.hint')}</p>
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !canEdit}
                  >
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {uploading ? `${uploadPercent}%` : t('attachments.uploadBtn')}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleUploadAttachment}
                  />
                </div>

                {uploading && <Progress value={uploadPercent} className="bg-[var(--color-surface-raised)]" />}

                {attachedFiles.length === 0 && attachedVideos.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">{t('attachments.empty')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-[var(--color-text-muted)]" />
                        <TableHead className="text-xs font-semibold text-[var(--color-text-muted)]">{t('files.formFolder')}</TableHead>
                        <TableHead className="text-xs font-semibold text-[var(--color-text-muted)]">{t('videos.fileSize')}</TableHead>
                        <TableHead className="text-xs font-semibold text-[var(--color-text-muted)]">{t('videos.uploadDate')}</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attachedVideos.map((video) => (
                        <TableRow
                          key={`v-${video.id}`}
                          className={busyAttachment === `video:${video.id}` ? 'opacity-60' : undefined}
                        >
                          <TableCell className="max-w-[150px] truncate text-xs font-medium text-[var(--color-text)] sm:max-w-[220px]">
                            {video.title}
                          </TableCell>
                          <TableCell className="text-xs text-[var(--color-text-muted)]">{t('videos.title')}</TableCell>
                          <TableCell className="font-mono text-xs text-[var(--color-text-muted)]">
                            {formatBytes(video.size)}
                          </TableCell>
                          <TableCell className="text-xs text-[var(--color-text-muted)]">
                            {formatDate(video.created_at)}
                          </TableCell>
                          <TableCell>
                            {canEdit && (
                              <RowActions
                                label={t('attachments.detachAria')}
                                busy={busyAttachment === `video:${video.id}`}
                                disabled={!!busyAttachment}
                                items={[
                                  {
                                    label: t('attachments.detachAria'),
                                    icon: <Link2Off className="size-4" />,
                                    onSelect: () => void handleDetach('video', video.id),
                                  },
                                ]}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                      {attachedFiles.map((file) => (
                        <TableRow
                          key={`f-${file.id}`}
                          className={busyAttachment === `file:${file.id}` ? 'opacity-60' : undefined}
                        >
                          <TableCell className="max-w-[150px] truncate text-xs font-medium text-[var(--color-text)] sm:max-w-[220px]">
                            {file.name}
                          </TableCell>
                          <TableCell className="text-xs text-[var(--color-text-muted)]">
                            {file.folder.toUpperCase()}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-[var(--color-text-muted)]">
                            {formatBytes(file.size)}
                          </TableCell>
                          <TableCell className="text-xs text-[var(--color-text-muted)]">
                            {formatDate(file.created_at)}
                          </TableCell>
                          <TableCell>
                            <RowActions
                              label={t('files.downloadAria', { name: file.name })}
                              busy={busyAttachment === `file:${file.id}`}
                              disabled={!!busyAttachment}
                              items={[
                                {
                                  label: t('files.download'),
                                  icon: <Download className="size-4" />,
                                  onSelect: () => void handleDownload(file),
                                },
                                ...(canEdit
                                  ? [
                                      {
                                        label: t('attachments.detachAria'),
                                        icon: <Link2Off className="size-4" />,
                                        onSelect: () => void handleDetach('file', file.id),
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {canEdit && (unlinkedFiles.length > 0 || unlinkedVideos.length > 0) && (
                  <div className="border-t border-[var(--color-border)] pt-3">
                    <span className="block text-xs font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
                      {t('attachments.linkExisting')}
                    </span>
                    <ul>
                      {unlinkedVideos.map((video) => (
                        <li
                          key={video.id}
                          className="flex items-center gap-2 border-b border-[var(--color-border)] py-2 last:border-b-0"
                        >
                          <Film className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--color-text)]">
                            {video.title}
                          </span>
                          <span className="hidden shrink-0 font-mono text-[10px] text-[var(--color-text-muted)] sm:block">
                            {formatBytes(video.size)} · {formatDate(video.created_at)}
                          </span>
                          <Button
                            size="xs"
                            variant="secondary"
                            disabled={!!busyAttachment}
                            onClick={() => void handleAttachExisting('video', video.id)}
                          >
                            {busyAttachment === `video:${video.id}` ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Link2 className="size-3.5" />
                            )}
                            {t('attachments.linkBtn')}
                          </Button>
                        </li>
                      ))}
                      {unlinkedFiles.map((file) => (
                        <li
                          key={file.id}
                          className="flex items-center gap-2 border-b border-[var(--color-border)] py-2 last:border-b-0"
                        >
                          <FileArchive className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--color-text)]">
                            {file.name}
                          </span>
                          <span className="hidden shrink-0 font-mono text-[10px] text-[var(--color-text-muted)] sm:block">
                            {formatBytes(file.size)} · {formatDate(file.created_at)}
                          </span>
                          <Button
                            size="xs"
                            variant="secondary"
                            disabled={!!busyAttachment}
                            onClick={() => void handleAttachExisting('file', file.id)}
                          >
                            {busyAttachment === `file:${file.id}` ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Link2 className="size-3.5" />
                            )}
                            {t('attachments.linkBtn')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('taskDetail.deleteConfirmTitle')}
        description={t('taskDetail.deleteConfirmDesc')}
        targetName={`"${task.title}"`}
        confirmLabel={t('taskDetail.deleteConfirmBtn')}
        cancelLabel={t('common.cancel')}
        isDangerous={true}
        onConfirm={async () => {
          try {
            await deleteTask(task.id);
            setShowDeleteConfirm(false);
            success(t('taskDetail.deleteSuccessTitle'), t('taskDetail.deleteSuccessMsg'));
            onClose();
          } catch {
            toastError(t('taskDetail.deleteFailedTitle'), t('apiError.system'));
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

function RowActions({
  label,
  items,
  busy = false,
  disabled = false,
}: {
  label: string;
  items: { label: string; icon: React.ReactNode; onSelect: () => void }[];
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        disabled={disabled}
        className="cursor-pointer rounded-md p-1.5 text-[var(--color-text-muted)] transition-colors outline-none hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] disabled:cursor-default disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <MoreVertical className="size-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {items.map((item) => (
          <DropdownMenuItem key={item.label} onSelect={item.onSelect}>
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-xs text-[var(--color-text-muted)]">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}
