'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video,
  Upload,
  Play,
  Film,
  AlertTriangle,
  X,
  FileVideo,
  RefreshCw,
  Clock,
  Zap,
  Loader2,
} from 'lucide-react';
import type { Task } from '@/types/database';
import {
  extractVideoMetadata,
  isBrowserUnsupportedFormat,
  uploadLargeFileToR2,
  validateUploadFile,
  type UploadProgress,
} from '@/lib/upload/client-uploader';
import { ApiClientError } from '@/lib/api-client';
import { useAppData } from '@/components/providers/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { useLocale } from '@/i18n/useLocale';
import { TranslationKey } from '@/i18n/dictionaries/vi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/progress';
import { FieldInput, FieldTextarea, FieldSelect } from '@/components/common/form';
import MemberAvatar from '@/components/common/member-avatar';
import LinkedTaskChip from '@/components/common/linked-task-chip';
import VideoPlayerModal from './VideoPlayerModal';

export default function VideoGallery({ selectedVideoId }: { selectedVideoId?: string }) {
  const { t, formatBytes, formatDuration, formatDate } = useLocale();
  const { success, error: toastError, warning } = useToast();
  const router = useRouter();
  const { videos, tasks, members, memberName, can, refresh } = useAppData();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [extractedDuration, setExtractedDuration] = useState(0);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoVersion, setVideoVersion] = useState('v1.0.0');
  const [videoDescription, setVideoDescription] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploading = uploadProgress?.status === 'uploading';

  const selectedVideo = selectedVideoId
    ? videos.find((video) => video.id === selectedVideoId) ?? null
    : null;

  const resetUploadForm = useCallback(() => {
    setSelectedFile(null);
    setPreviewThumbnail(null);
    setExtractedDuration(0);
    setVideoTitle('');
    setVideoVersion('v1.0.0');
    setVideoDescription('');
    setLinkedTaskId('');
    setUploadProgress(null);
    setUploadError(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showUploadModal && uploadProgress?.status !== 'uploading') {
        setShowUploadModal(false);
        resetUploadForm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUploadModal, uploadProgress?.status, resetUploadForm]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateUploadFile(file, 'video');
    if (!validation.valid) {
      setUploadError(t(`upload.error.${validation.code}` as TranslationKey, validation.params));
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
    setIsProcessingFile(true);
    setUploadError(null);

    try {
      const { duration, thumbnailBlob } = await extractVideoMetadata(file);
      setExtractedDuration(duration);
      if (thumbnailBlob) setPreviewThumbnail(URL.createObjectURL(thumbnailBlob));
    } catch (err) {
      console.warn('video metadata extraction failed:', err);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleStartUpload = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!selectedFile) return;

    setUploadError(null);
    abortControllerRef.current = new AbortController();

    try {
      await uploadLargeFileToR2({
        file: selectedFile,
        kind: 'video',
        extraMetadata: {
          title: videoTitle.trim(),
          version: videoVersion.trim(),
          description: videoDescription.trim(),
          duration: extractedDuration,
          linkedTaskId: linkedTaskId || null,
        },
        signal: abortControllerRef.current.signal,
        onProgress: setUploadProgress,
      });

      await refresh();
      success(t('videos.uploadSuccessTitle'), t('videos.uploadSuccessMsg', { title: videoTitle.trim() }));
      setShowUploadModal(false);
      resetUploadForm();
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

  const unsupportedFormat = selectedFile ? isBrowserUnsupportedFormat(selectedFile.name) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text)]">
            <Film className="size-5 text-[var(--color-brand)]" /> {t('videos.title')}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{t('videos.subtitle')}</p>
        </div>

        {can.contribute && (
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="size-4" />
            {t('videos.uploadBtn')}
          </Button>
        )}
      </div>

      {videos.length === 0 ? (
        <Card className="gap-0 border-dashed bg-[var(--color-surface)]/50 p-12 text-center">
          <FileVideo className="mx-auto mb-3 size-12 text-[var(--color-text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('videos.emptyTitle')}</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-text-muted)]">
            {t('videos.emptyDesc')}
          </p>
          <div className="mt-4">
            {can.contribute && (
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="size-4" />
                {t('videos.uploadFirstBtn')}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => {
            const uploader = members.find((member) => member.id === video.uploaded_by);
            return (
              <Card
                key={video.id}
                onClick={() => router.push(`/videos/${video.id}`)}
                className="group cursor-pointer gap-0 overflow-hidden p-0 transition-colors hover:border-[var(--color-border-strong)] hover:shadow-sm"
              >
                <div className="relative aspect-video overflow-hidden bg-black">
                  {video.thumbnail_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                      <Video className="size-10" />
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-brand)] text-white shadow-lg shadow-black/20">
                      <Play className="ml-0.5 size-6" fill="white" />
                    </div>
                  </div>

                  <div className="absolute right-2 bottom-2 rounded bg-black/85 px-2 py-0.5 font-mono text-[11px] font-medium text-white backdrop-blur-sm">
                    {formatDuration(video.duration)}
                  </div>

                  <div className="absolute top-2 left-2 rounded bg-[var(--color-brand)]/90 px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
                    {video.version}
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h3 className="line-clamp-1 text-sm font-semibold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-brand)]">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]">{video.description}</p>
                    )}
                  </div>

                  <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3 text-[11px] text-[var(--color-text-muted)]">
                    <LinkedTaskChip task={tasks.find((task) => task.id === video.linked_task_id)} className="w-full" />
                    <div className="flex items-center justify-between">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <MemberAvatar slot={uploader?.slot} name={memberName(video.uploaded_by)} size="xs" />
                        <span className="truncate">{memberName(video.uploaded_by) ?? '—'}</span>
                      </span>
                      <span className="ml-2 shrink-0">
                        {formatBytes(video.size)} · {formatDate(video.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedVideo && (
        <VideoPlayerModal video={selectedVideo} onClose={() => router.push('/videos')} />
      )}

      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/45 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-video-modal-title"
        >
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 id="upload-video-modal-title" className="text-[15px] font-semibold text-[var(--color-text)]">
                {t('videos.uploadModalTitle')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (uploadProgress?.status !== 'uploading') {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }
                }}
                aria-label={t('videos.closeModalAria')}
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
                  <Video className="mx-auto mb-2 size-10 text-[var(--color-brand)]" />
                  <p className="text-xs font-semibold text-[var(--color-text)]">{t('videos.dropzoneText')}</p>
                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{t('videos.dropzoneHint')}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-black">
                      {previewThumbnail ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={previewThumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                          {isProcessingFile ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            t('videos.noThumb')
                          )}
                        </div>
                      )}
                      {extractedDuration > 0 && (
                        <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 font-mono text-[9px] text-[var(--color-text)]">
                          {formatDuration(extractedDuration)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[var(--color-text)]">{selectedFile.name}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                        {formatBytes(selectedFile.size)} • {formatDuration(extractedDuration)}
                      </p>
                    </div>

                    {uploadProgress?.status !== 'uploading' && (
                      <button
                        type="button"
                        onClick={resetUploadForm}
                        aria-label={t('videos.removeSelected')}
                        className="cursor-pointer p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>

                  {unsupportedFormat && (
                    <div className="flex items-center gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] px-3 py-2 text-xs text-[var(--color-warning)]">
                      <AlertTriangle className="size-4 shrink-0 text-[var(--color-warning)]" />
                      <span>
                        {t('videos.warningFormat', {
                          ext: selectedFile.name.split('.').pop() ?? '',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <FieldInput
                    label={t('videos.formVersion')}
                    type="text"
                    required
                    maxLength={40}
                    value={videoVersion}
                    onChange={(event) => setVideoVersion(event.target.value)}
                    placeholder="v0.4.5"
                  />
                </div>
                <div className="col-span-2">
                  <FieldInput
                    label={t('videos.formTitle')}
                    type="text"
                    required
                    maxLength={200}
                    value={videoTitle}
                    onChange={(event) => setVideoTitle(event.target.value)}
                    placeholder={t('videos.formTitlePlaceholder')}
                  />
                </div>
              </div>

              <FieldTextarea
                label={t('videos.formDesc')}
                rows={2}
                value={videoDescription}
                onChange={(event) => setVideoDescription(event.target.value)}
                placeholder={t('videos.formDescPlaceholder')}
              />

              <FieldSelect
                label={t('videos.formLinkedTask')}
                value={linkedTaskId}
                onChange={(event) => setLinkedTaskId(event.target.value)}
              >
                <option value="">{t('files.noLinkedTask')}</option>
                {tasks.map((task: Task) => (
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
                          <span className="flex items-center gap-1 font-mono text-[var(--color-brand-hover)]">
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
                      resetUploadForm();
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
    </div>
  );
}
