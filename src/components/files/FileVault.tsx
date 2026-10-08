'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileBox,
  Upload,
  Download,
  FileArchive,
  Image as ImageIcon,
  Music,
  File,
  Trash2,
  X,
  AlertTriangle,
  RefreshCw,
  Zap,
  Clock,
  Loader2,
} from 'lucide-react';
import type { FileRecord, UploadKind } from '@/types/database';
import {
  uploadLargeFileToR2,
  validateUploadFile,
  type UploadProgress,
} from '@/lib/upload/client-uploader';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useAppData } from '@/components/providers/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { useLocale } from '@/i18n/useLocale';
import { TranslationKey } from '@/i18n/dictionaries/vi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/progress';
import { FieldSelect } from '@/components/common/form';
import LinkedTaskChip from '@/components/common/linked-task-chip';
import ConfirmDialog from '@/components/common/confirm-dialog';
import MemberAvatar from '@/components/common/member-avatar';

const ARCHIVE_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.apk', '.exe'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ase', '.psd'];
const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.ogg', '.flac'];

export default function FileVault() {
  const { t, formatBytes, formatDate } = useLocale();
  const { success, error: toastError, warning } = useToast();
  const { files, tasks, members, memberName, can, deleteFile, refresh } = useAppData();

  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [activeFolder, setActiveFolder] = useState('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('general');
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploading = uploadProgress?.status === 'uploading';

  const folderTabs = [
    { id: 'ALL', label: t('files.folderAll') },
    { id: 'builds', label: t('files.folderBuilds') },
    { id: 'assets', label: t('files.folderAssets') },
    { id: 'audio', label: t('files.folderAudio') },
    { id: 'general', label: t('files.folderGeneral') },
  ];

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setSelectedFolder('general');
    setLinkedTaskId('');
    setUploadProgress(null);
    setUploadError(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewFile(null);
      if (event.key === 'Escape' && showUploadModal && uploadProgress?.status !== 'uploading') {
        setShowUploadModal(false);
        resetForm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUploadModal, uploadProgress?.status, resetForm]);

  const filteredFiles = files.filter((file) => activeFolder === 'ALL' || file.folder === activeFolder);

  const getFileIcon = (filename: string) => {
    const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if (ARCHIVE_EXTENSIONS.includes(extension)) return <FileArchive className="size-5 text-[var(--color-warning)]" />;
    if (IMAGE_EXTENSIONS.includes(extension)) return <ImageIcon className="size-5 text-[var(--color-brand)]" />;
    if (AUDIO_EXTENSIONS.includes(extension)) return <Music className="size-5 text-[var(--color-success-text)]" />;
    return <File className="size-5 text-[var(--color-text-muted)]" />;
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const data = await apiFetch<{ downloadUrl: string }>(`/api/files/${fileId}/download`);
      window.open(data.downloadUrl, '_blank', 'noopener');
    } catch {
      toastError(t('files.downloadFailedTitle'), t('files.downloadFailedMsg', { name: fileName }));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const kind: UploadKind = selectedFolder === 'builds' ? 'build' : 'file';
    const validation = validateUploadFile(file, kind);
    if (!validation.valid) {
      setUploadError(t(`upload.error.${validation.code}` as TranslationKey, validation.params));
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  };

  const handleStartUpload = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!selectedFile) return;

    setUploadError(null);
    abortControllerRef.current = new AbortController();
    const kind: UploadKind = selectedFolder === 'builds' ? 'build' : 'file';

    try {
      await uploadLargeFileToR2({
        file: selectedFile,
        kind,
        extraMetadata: {
          folder: selectedFolder,
          linkedTaskId: linkedTaskId || null,
        },
        signal: abortControllerRef.current.signal,
        onProgress: setUploadProgress,
      });

      await refresh();
      success(t('files.uploadSuccessTitle'), t('files.uploadSuccessMsg', { name: selectedFile.name }));
      setShowUploadModal(false);
      resetForm();
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        warning(t('videos.uploadAbortedTitle'), t('videos.uploadAbortedMsg'));
        return;
      }
      const message =
        err instanceof ApiClientError
          ? t(`apiError.${err.code}` as TranslationKey)
          : err instanceof Error
            ? err.message
            : t('apiError.system');
      setUploadError(message);
      toastError(t('videos.uploadErrorTitle'), message);
    }
  };

  const handleAbortUpload = () => {
    abortControllerRef.current?.abort();
    setUploadProgress((prev) => (prev ? { ...prev, status: 'aborted' } : null));
    warning(t('videos.uploadAbortedTitle'), t('videos.uploadAbortedMsg'));
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    const target = files.find((file) => file.id === fileToDelete);
    try {
      await deleteFile(fileToDelete);
      success(t('files.deleteSuccessTitle'), t('files.deleteSuccessMsg', { name: target?.name ?? '' }));
    } catch (err) {
      toastError(
        t('files.deleteFailedTitle'),
        err instanceof ApiClientError ? t(`apiError.${err.code}` as TranslationKey) : t('apiError.system')
      );
    } finally {
      setFileToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text)]">
            <FileBox className="size-5 text-[var(--color-success-text)]" /> {t('files.title')}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{t('files.subtitle')}</p>
        </div>

        {can.contribute && (
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="size-4" />
            {t('files.uploadBtn')}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist">
        {folderTabs.map((folder) => {
          const isActive = activeFolder === folder.id;
          return (
            <button
              type="button"
              key={folder.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFolder(folder.id)}
              className={`shrink-0 cursor-pointer rounded-md border px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                isActive
                  ? 'border-[var(--color-brand)]/40 bg-[var(--color-brand-soft)] font-semibold text-[var(--color-brand-hover)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]'
              }`}
            >
              {folder.label}
            </button>
          );
        })}
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <div className="divide-y divide-[var(--color-border)]">
          {filteredFiles.length === 0 ? (
            <div className="p-10 text-center text-xs text-[var(--color-text-muted)]">
              <FileBox className="mx-auto mb-2 size-10 opacity-80" />
              <p className="font-medium text-[var(--color-text)]">{t('files.emptyTitle')}</p>
              <p className="mx-auto mt-1 max-w-sm leading-relaxed">{t('files.emptyDesc')}</p>
              <div className="mt-4">
                {can.contribute && (
                  <Button onClick={() => setShowUploadModal(true)}>
                    <Upload className="size-4" />
                    {t('files.uploadFirstBtn')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const linkedTask = tasks.find((task) => task.id === file.linked_task_id);
              const uploader = members.find((member) => member.id === file.uploaded_by);

              return (
                <div
                  key={file.id}
                  className="group flex flex-col justify-between gap-3 p-4 transition-colors duration-150 hover:bg-[var(--color-surface)] sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                      {getFileIcon(file.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-brand-hover)]">
                        {file.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
                        <span className="font-mono font-semibold uppercase text-[var(--color-brand)]">{file.folder}</span>
                        <span aria-hidden="true">•</span>
                        <span>{formatBytes(file.size)}</span>
                        <span aria-hidden="true">•</span>
                        <span className="flex items-center gap-1.5">
                          <MemberAvatar slot={uploader?.slot} name={memberName(file.uploaded_by)} size="xs" />
                          {memberName(file.uploaded_by) ?? '—'}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span>{formatDate(file.created_at)}</span>
                      </div>
                      <LinkedTaskChip task={linkedTask} className="mt-1.5" />
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {file.preview_url && <Button variant="secondary" size="sm" onClick={() => setPreviewFile(file)} aria-label={t('files.previewAria', { name: file.name })}><ImageIcon className="size-4" />{t('files.preview')}</Button>}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleDownload(file.id, file.name)}
                      aria-label={t('files.downloadAria', { name: file.name })}
                    >
                      <Download className="size-4" />
                      {t('files.download')}
                    </Button>

                    {can.manageRecord(file.uploaded_by) && (
                      <button
                        type="button"
                        onClick={() => setFileToDelete(file.id)}
                        className="cursor-pointer rounded-md p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
                        aria-label={t('files.deleteAria', { name: file.name })}
                        title={t('files.delete')}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/45 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-file-modal-title"
        >
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 id="upload-file-modal-title" className="text-[15px] font-semibold text-[var(--color-text)]">
                {t('files.uploadModalTitle')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (uploadProgress?.status !== 'uploading') {
                    setShowUploadModal(false);
                    resetForm();
                  }
                }}
                aria-label={t('files.closeModalAria')}
                className="cursor-pointer rounded-md p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleStartUpload} className="space-y-4">
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)]/60 p-8 text-center transition-colors hover:border-[var(--color-brand)]"
                >
                  <FileBox className="mx-auto mb-2 size-10 text-[var(--color-success-text)]" />
                  <p className="text-xs font-semibold text-[var(--color-text)]">{t('files.dropzoneText')}</p>
                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{t('files.dropzoneHint')}</p>
                  <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="min-w-0 pr-3">
                    <p className="truncate text-xs font-semibold text-[var(--color-text)]">{selectedFile.name}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                      {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                  {uploadProgress?.status !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      aria-label={t('videos.removeSelected')}
                      className="cursor-pointer p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              )}

              <FieldSelect
                label={t('files.formFolder')}
                value={selectedFolder}
                onChange={(event) => setSelectedFolder(event.target.value)}
              >
                <option value="general">{t('files.folderOptionGeneral')}</option>
                <option value="builds">{t('files.folderOptionBuilds')}</option>
                <option value="assets">{t('files.folderOptionAssets')}</option>
                <option value="audio">{t('files.folderOptionAudio')}</option>
              </FieldSelect>

              <FieldSelect
                label={t('files.formLinkedTask')}
                value={linkedTaskId}
                onChange={(event) => setLinkedTaskId(event.target.value)}
              >
                <option value="">{t('files.noLinkedTask')}</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </FieldSelect>

              {uploadProgress && (
                <div className="space-y-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--color-text)]">
                      {uploadProgress.status === 'initializing' && t('videos.statusInit')}
                      {uploadProgress.status === 'uploading' &&
                        t('videos.statusUploading', {
                          part: uploadProgress.currentPart,
                          totalParts: uploadProgress.totalParts,
                        })}
                      {uploadProgress.status === 'completing' && t('videos.statusCompleting')}
                      {uploadProgress.status === 'done' && t('videos.statusDone')}
                      {uploadProgress.status === 'aborted' && t('videos.statusAborted')}
                      {uploadProgress.status === 'error' && t('videos.statusError')}
                    </span>
                    <span className="font-mono font-semibold text-[var(--color-brand-hover)]">{uploadProgress.percentage}%</span>
                  </div>

                  <Progress value={uploadProgress.percentage} className="bg-[var(--color-surface-raised)]" />

                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                    <span>
                      {t('videos.uploadedSize', {
                        uploaded: formatBytes(uploadProgress.uploadedBytes),
                        total: formatBytes(uploadProgress.totalBytes),
                      })}
                    </span>
                    {uploadProgress.status === 'uploading' && (
                      <div className="flex items-center gap-3">
                        {uploadProgress.speedBytesPerSec > 0 && (
                          <span className="flex items-center gap-1 font-mono text-[var(--color-text)]">
                            <Zap className="size-3 text-[var(--color-warning)]" />
                            {t('videos.uploadSpeed', { speed: formatBytes(uploadProgress.speedBytesPerSec) })}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-mono text-[var(--color-text)]">
                          <Clock className="size-3 text-[var(--color-brand)]" />
                          {t('videos.uploadEta', { seconds: Math.ceil(uploadProgress.remainingSeconds) })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="flex items-center justify-between rounded-md border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] p-3 text-xs text-[var(--color-danger)]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleStartUpload()}
                    className="ml-2 flex shrink-0 cursor-pointer items-center gap-1 font-medium underline underline-offset-2 hover:no-underline"
                  >
                    <RefreshCw className="size-3.5" /> {t('videos.retry')}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                {uploading ? (
                  <Button type="button" variant="destructive" size="sm" onClick={handleAbortUpload}>
                    {t('videos.cancelUpload')}
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={uploading}
                    onClick={() => {
                      setShowUploadModal(false);
                      resetForm();
                    }}
                  >
                    {t('videos.close')}
                  </Button>
                  <Button type="submit" disabled={!selectedFile || uploading}>
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {t('videos.startUpload')}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewFile && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="file-preview-title" onClick={() => setPreviewFile(null)}>
        <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-[var(--color-bg)] p-4" onClick={(event) => event.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between gap-3"><h3 id="file-preview-title" className="truncate text-sm font-semibold">{previewFile.name}</h3><Button variant="ghost" size="sm" onClick={() => setPreviewFile(null)} aria-label={t('files.previewClose')}><X className="size-4" /></Button></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewFile.preview_url!} alt={previewFile.name} className="mx-auto max-h-[75vh] object-contain" />
        </div>
      </div>}
      <ConfirmDialog
        isOpen={!!fileToDelete}
        title={t('files.deleteConfirmTitle')}
        description={t('files.deleteConfirmDesc')}
        targetName={`"${files.find((file) => file.id === fileToDelete)?.name ?? ''}"`}
        confirmLabel={t('files.deleteConfirmBtn')}
        cancelLabel={t('common.cancel')}
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setFileToDelete(null)}
      />
    </div>
  );
}
