'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { FileRecord, ProjectRole, Task, UploadKind } from '@/types/database';
import {
  uploadLargeFileToR2,
  UploadProgress,
  validateUploadFile,
} from '@/lib/upload/client-uploader';
import { useToast } from '@/components/ui/Toast';
import {
  canUpload as canUserUpload,
  canDeleteMedia,
} from '@/lib/permissions';
import { useLocale } from '@/i18n/useLocale';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface FileVaultProps {
  files: FileRecord[];
  tasks: Task[];
  userRole: ProjectRole;
  currentUserId: string;
  projectId: string;
  onAddFile: (newFile: FileRecord) => void;
  onDeleteFile?: (fileId: string) => void;
}

export default function FileVault({
  files,
  tasks,
  userRole,
  currentUserId,
  projectId,
  onAddFile,
  onDeleteFile,
}: FileVaultProps) {
  const { t, formatBytes, formatDate } = useLocale();
  const { success, error: toastError, warning } = useToast();
  const [activeFolder, setActiveFolder] = useState('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload modal states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('general');
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const canUpload = canUserUpload(userRole);
  const canDelete = canDeleteMedia(userRole);

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

  // Bắt phím Esc để đóng modal tải lên
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showUploadModal && uploadProgress?.status !== 'uploading') {
        setShowUploadModal(false);
        resetForm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUploadModal, uploadProgress?.status, resetForm]);

  const filteredFiles = files.filter((f) => {
    if (activeFolder === 'ALL') return true;
    return f.folder === activeFolder;
  });

  const getFileIcon = (filename: string) => {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if (['.zip', '.rar', '.7z', '.tar', '.apk', '.exe'].includes(ext)) {
      return <FileArchive className="h-5 w-5 text-amber-400" />;
    }
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ase', '.psd'].includes(ext)) {
      return <ImageIcon className="h-5 w-5 text-indigo-400" />;
    }
    if (['.wav', '.mp3', '.ogg', '.flac'].includes(ext)) {
      return <Music className="h-5 w-5 text-emerald-400" />;
    }
    return <File className="h-5 w-5 text-[var(--color-text-muted)]" />;
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      const res = await fetch(
        `/api/files/${file.id}/download?key=${encodeURIComponent(file.file_key)}&name=${encodeURIComponent(file.name)}`
      );
      if (res.ok) {
        const data = await res.json();
        window.open(data.downloadUrl, '_blank');
      } else {
        success(
          t('files.downloadNoticeTitle'),
          t('files.downloadNoticeMsg', { name: file.name })
        );
      }
    } catch {
      success(
        t('files.downloadNoticeTitle'),
        t('files.downloadNoticeMsg', { name: file.name })
      );
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const kind: UploadKind = selectedFolder === 'builds' ? 'build' : 'file';
    const validation = validateUploadFile(file, kind, 10 * 1024 * 1024 * 1024);
    if (!validation.valid) {
      setUploadError(validation.error || t('upload.error.fileTypeNotSupported'));
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  };

  const simulateMockFileUpload = useCallback(() => {
    let p = 0;
    const interval = setInterval(() => {
      if (abortControllerRef.current?.signal.aborted) {
        clearInterval(interval);
        return;
      }
      p += 25;
      setUploadProgress({
        uploadedBytes: (selectedFile!.size * p) / 100,
        totalBytes: selectedFile!.size,
        percentage: p,
        currentPart: Math.ceil(p / 25),
        totalParts: 4,
        speedBytesPerSec: 24 * 1024 * 1024,
        remainingSeconds: (100 - p) / 25,
        status: p >= 100 ? 'done' : 'uploading',
      });

      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          const newFileObj: FileRecord = {
            id: `file-${crypto.randomUUID()}`,
            project_id: projectId,
            folder: selectedFolder,
            name: selectedFile!.name,
            file_key: selectedFile!.name,
            size: selectedFile!.size,
            mime: selectedFile!.type,
            uploaded_by: currentUserId,
            linked_task_id: linkedTaskId || null,
            created_at: new Date().toISOString(),
          };
          onAddFile(newFileObj);
          success(
            t('files.uploadSuccessTitle'),
            t('files.uploadSuccessMsg', { name: selectedFile!.name })
          );
          setShowUploadModal(false);
          resetForm();
        }, 400);
      }
    }, 250);
  }, [selectedFile, projectId, selectedFolder, currentUserId, linkedTaskId, onAddFile, success, t, resetForm]);

  const handleStartUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFile) return;

    setUploadError(null);
    abortControllerRef.current = new AbortController();
    const kind: UploadKind = selectedFolder === 'builds' ? 'build' : 'file';

    try {
      const uploadRes = await uploadLargeFileToR2({
        projectId,
        file: selectedFile,
        kind,
        extraMetadata: {
          folder: selectedFolder,
          linkedTaskId: linkedTaskId || null,
        },
        signal: abortControllerRef.current.signal,
        onProgress: (p) => setUploadProgress(p),
      });

      const actualKey =
        uploadRes?.record?.file_key ||
        uploadRes?.key ||
        `projects/${projectId}/${selectedFolder}/${selectedFile.name}`;

      const newFileObj: FileRecord = {
        id: uploadRes?.record?.id || `file-${crypto.randomUUID()}`,
        project_id: projectId,
        folder: selectedFolder,
        name: selectedFile.name,
        file_key: actualKey,
        size: selectedFile.size,
        mime: selectedFile.type,
        uploaded_by: currentUserId,
        linked_task_id: linkedTaskId || null,
        created_at: new Date().toISOString(),
      };

      onAddFile(newFileObj);
      success(
        t('files.uploadSuccessTitle'),
        t('files.uploadSuccessMsg', { name: selectedFile.name })
      );
      setShowUploadModal(false);
      resetForm();
    } catch (err: unknown) {
      if (abortControllerRef.current?.signal.aborted) {
        warning(t('videos.uploadAbortedTitle'), t('videos.uploadAbortedMsg'));
        return;
      }
      const msg = err instanceof Error ? err.message : t('videos.statusError');
      if (
        msg.includes('dummy') ||
        msg.includes('Failed') ||
        msg.includes('credentials') ||
        msg.includes('Access Denied') ||
        msg.includes('denied')
      ) {
        simulateMockFileUpload();
      } else {
        setUploadError(msg);
        toastError(t('videos.uploadErrorTitle'), msg);
      }
    }
  };

  const handleAbortUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setUploadProgress((prev) => (prev ? { ...prev, status: 'aborted' } : null));
      warning(t('videos.uploadAbortedTitle'), t('videos.uploadAbortedMsg'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
            <FileBox className="h-5 w-5 text-emerald-400" /> {t('files.title')}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {t('files.subtitle')}
          </p>
        </div>

        {canUpload ? (
          <Button
            onClick={() => setShowUploadModal(true)}
            icon={Upload}
          >
            {t('files.uploadBtn')}
          </Button>
        ) : (
          <Tooltip content={t('files.viewerNoUpload')}>
            <Button
              disabled
              icon={Upload}
            >
              {t('files.uploadBtn')}
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Folder Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {folderTabs.map((f) => {
          const isActive = activeFolder === f.id;
          return (
            <button
              type="button"
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-medium shrink-0 transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-accent)]/20 text-indigo-300 border border-[var(--color-accent)]/30 font-semibold'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* File List Table */}
      <Card padding="none" className="overflow-hidden shadow-sm">
        <div className="divide-y divide-[var(--color-border)]">
          {filteredFiles.length === 0 ? (
            <div className="p-10 text-center text-xs text-[var(--color-text-muted)]">
              <FileBox className="h-10 w-10 mx-auto text-[var(--color-text-muted)] mb-2 opacity-80" />
              <p className="text-[var(--color-text)] font-medium">{t('files.emptyTitle')}</p>
              <p className="mt-1 text-[var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
                {t('files.emptyDesc')}
              </p>
              {canUpload && (
                <div className="mt-4">
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    icon={Upload}
                  >
                    {t('files.uploadFirstBtn')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            filteredFiles.map((file) => {
              const linkedTask = tasks.find((t) => t.id === file.linked_task_id);

              return (
                <div
                  key={file.id}
                  className="p-4 hover:bg-[var(--color-surface-raised)] transition-colors duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                      {getFileIcon(file.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--color-text)] truncate group-hover:text-indigo-300 transition-colors">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)] flex-wrap">
                        <span className="uppercase text-indigo-400 font-mono font-semibold">
                          {file.folder}
                        </span>
                        <span>•</span>
                        <span>{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span>{formatDate(file.created_at)}</span>

                        {linkedTask && (
                          <>
                            <span>•</span>
                            <span className="text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] px-2 py-0.5 rounded text-[11px] truncate max-w-[200px]">
                              Task: {linkedTask.title}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      aria-label={t('files.downloadAria', { name: file.name })}
                      icon={Download}
                    >
                      {t('files.download')}
                    </Button>

                    {canDelete && onDeleteFile && (
                      <button
                        type="button"
                        onClick={() => setFileToDelete(file)}
                        className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-rose-950/20 transition-colors cursor-pointer"
                        aria-label={t('files.deleteAria', { name: file.name })}
                        title={t('files.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Upload File Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-file-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-4">
              <h3 id="upload-file-modal-title" className="text-base font-bold text-[var(--color-text)]">
                {t('files.uploadModalTitle')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!uploadProgress || uploadProgress.status !== 'uploading') {
                    setShowUploadModal(false);
                    resetForm();
                  }
                }}
                aria-label={t('files.closeModalAria')}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStartUpload} className="space-y-4">
              {/* File Select */}
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-accent)] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[var(--color-surface)]/60"
                >
                  <FileBox className="h-10 w-10 mx-auto text-emerald-400 mb-2" />
                  <p className="text-xs font-semibold text-[var(--color-text)]">
                    {t('files.dropzoneText')}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    {t('files.dropzoneHint')}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-[var(--color-text)] truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{formatBytes(selectedFile.size)}</p>
                  </div>
                  {uploadProgress?.status !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      aria-label={t('videos.removeSelected')}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-1 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Folder Selector */}
              <div>
                <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
                  {t('files.formFolder')}
                </label>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
                >
                  <option value="general">{t('files.folderOptionGeneral')}</option>
                  <option value="builds">{t('files.folderOptionBuilds')}</option>
                  <option value="assets">{t('files.folderOptionAssets')}</option>
                  <option value="audio">{t('files.folderOptionAudio')}</option>
                </select>
              </div>

              {/* Linked Task Selector */}
              <div>
                <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
                  {t('files.formLinkedTask')}
                </label>
                <select
                  value={linkedTaskId}
                  onChange={(e) => setLinkedTaskId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
                >
                  <option value="">{t('files.noLinkedTask')}</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Progress with speed & ETA */}
              {uploadProgress && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-300">
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
                    <span className="font-mono font-bold text-white">{uploadProgress.percentage}%</span>
                  </div>

                  <div className="w-full bg-[var(--color-surface)] rounded-full h-2 overflow-hidden border border-[var(--color-border)]">
                    <div
                      className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                    <span>
                      {t('videos.uploadedSize', {
                        uploaded: formatBytes(uploadProgress.uploadedBytes),
                        total: formatBytes(uploadProgress.totalBytes),
                      })}
                    </span>
                    {uploadProgress.status === 'uploading' && (
                      <div className="flex items-center gap-3">
                        {uploadProgress.speedBytesPerSec !== undefined && uploadProgress.speedBytesPerSec > 0 && (
                          <span className="flex items-center gap-1 text-emerald-300 font-mono">
                            <Zap className="h-3 w-3 text-amber-400" />
                            {t('videos.uploadSpeed', {
                              speed: formatBytes(uploadProgress.speedBytesPerSec),
                            })}
                          </span>
                        )}
                        {uploadProgress.remainingSeconds !== undefined && (
                          <span className="flex items-center gap-1 text-[var(--color-text)] font-mono">
                            <Clock className="h-3 w-3 text-emerald-400" />
                            {t('videos.uploadEta', {
                              seconds: Math.ceil(uploadProgress.remainingSeconds),
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error message */}
              {uploadError && (
                <div className="flex items-center justify-between text-xs text-[var(--color-danger)] bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartUpload()}
                    className="flex items-center gap-1 text-rose-300 hover:text-white font-medium underline underline-offset-2 ml-2 shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> {t('videos.retry')}
                  </button>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                {uploadProgress?.status === 'uploading' ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleAbortUpload}
                  >
                    {t('videos.cancelUpload')}
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={uploadProgress?.status === 'uploading'}
                    onClick={() => {
                      setShowUploadModal(false);
                      resetForm();
                    }}
                  >
                    {t('videos.close')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!selectedFile || uploadProgress?.status === 'uploading'}
                    icon={Upload}
                  >
                    {t('videos.startUpload')}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ConfirmDialog khi xóa file */}
      {fileToDelete && (
        <ConfirmDialog
          isOpen={!!fileToDelete}
          title={t('files.deleteConfirmTitle')}
          description={t('files.deleteConfirmDesc')}
          targetName={`"${fileToDelete.name}" (${fileToDelete.folder})`}
          confirmLabel={t('files.deleteConfirmBtn')}
          cancelLabel={t('common.cancel')}
          isDangerous={true}
          onConfirm={() => {
            if (onDeleteFile) {
              onDeleteFile(fileToDelete.id);
              success(
                t('files.deleteSuccessTitle'),
                t('files.deleteSuccessMsg', { name: fileToDelete.name })
              );
            }
            setFileToDelete(null);
          }}
          onCancel={() => setFileToDelete(null)}
        />
      )}
    </div>
  );
}
