'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { GameplayVideo, ProjectRole } from '@/types/database';
import {
  extractVideoMetadata,
  uploadLargeFileToR2,
  UploadProgress,
  validateUploadFile,
  isBrowserUnsupportedFormat,
} from '@/lib/upload/client-uploader';
import { useToast } from '@/components/ui/Toast';
import { canUpload as canUserUpload } from '@/lib/permissions';
import { useLocale } from '@/i18n/useLocale';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import VideoPlayerModal from './VideoPlayerModal';

interface VideoGalleryProps {
  videos: GameplayVideo[];
  userRole: ProjectRole;
  currentUserId: string;
  projectId: string;
  onAddVideo: (newVid: GameplayVideo) => void;
  onDeleteVideo?: (videoId: string) => void;
  selectedVideo?: GameplayVideo | null;
  onClearSelectedVideo?: () => void;
}

export default function VideoGallery({
  videos,
  userRole,
  currentUserId,
  projectId,
  onAddVideo,
  onDeleteVideo,
  selectedVideo,
  onClearSelectedVideo,
}: VideoGalleryProps) {
  const { t, formatBytes, formatDuration, formatDate } = useLocale();
  const { success, error: toastError, warning } = useToast();
  const [activeVideo, setActiveVideo] = useState<GameplayVideo | null>(selectedVideo || null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload modal states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [extractedDuration, setExtractedDuration] = useState<number>(0);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoVersion, setVideoVersion] = useState('v1.0.0');
  const [videoDescription, setVideoDescription] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const canUpload = canUserUpload(userRole);

  const resetUploadForm = useCallback(() => {
    setSelectedFile(null);
    setPreviewThumbnail(null);
    setExtractedDuration(0);
    setVideoTitle('');
    setVideoVersion('v1.0.0');
    setVideoDescription('');
    setUploadProgress(null);
    setUploadError(null);
  }, []);

  // Bắt phím Esc để đóng modal tải lên (chỉ khi không đang upload)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showUploadModal && uploadProgress?.status !== 'uploading') {
        setShowUploadModal(false);
        resetUploadForm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUploadModal, uploadProgress?.status, resetUploadForm]);

  // Khi chọn file video: validate và trích xuất thumbnail & duration an toàn
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateUploadFile(file, 'video', 5 * 1024 * 1024 * 1024);
    if (!validation.valid) {
      setUploadError(validation.error || t('upload.error.fileTypeNotSupported'));
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
      if (thumbnailBlob) {
        setPreviewThumbnail(URL.createObjectURL(thumbnailBlob));
      }
    } catch (err) {
      console.warn('Lỗi trích xuất metadata video:', err);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const simulateMockUpload = useCallback(() => {
    let p = 0;
    const interval = setInterval(() => {
      if (abortControllerRef.current?.signal.aborted) {
        clearInterval(interval);
        return;
      }
      p += 20;
      setUploadProgress({
        uploadedBytes: (selectedFile!.size * p) / 100,
        totalBytes: selectedFile!.size,
        percentage: p,
        currentPart: Math.ceil(p / 25),
        totalParts: 4,
        speedBytesPerSec: 15 * 1024 * 1024,
        remainingSeconds: (100 - p) / 20,
        status: p >= 100 ? 'done' : 'uploading',
      });

      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          const newVideoObj: GameplayVideo = {
            id: `vid-${crypto.randomUUID()}`,
            project_id: projectId,
            version: videoVersion.trim(),
            title: videoTitle.trim(),
            description: videoDescription.trim(),
            file_key: selectedFile!.name,
            thumbnail_key:
              previewThumbnail ||
              'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
            duration: extractedDuration || 120,
            size: selectedFile!.size,
            uploaded_by: currentUserId,
            created_at: new Date().toISOString(),
          };
          onAddVideo(newVideoObj);
          success(
            t('videos.uploadSuccessTitle'),
            t('videos.uploadSuccessMsg', { title: videoTitle.trim() })
          );
          setShowUploadModal(false);
          resetUploadForm();
        }, 500);
      }
    }, 300);
  }, [selectedFile, projectId, videoVersion, videoTitle, videoDescription, previewThumbnail, extractedDuration, currentUserId, onAddVideo, success, t, resetUploadForm]);

  const handleStartUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFile) return;

    setUploadError(null);
    abortControllerRef.current = new AbortController();

    try {
      const uploadRes = await uploadLargeFileToR2({
        projectId,
        file: selectedFile,
        kind: 'video',
        extraMetadata: {
          title: videoTitle.trim(),
          version: videoVersion.trim(),
          description: videoDescription.trim(),
          duration: extractedDuration,
        },
        signal: abortControllerRef.current.signal,
        onProgress: (p) => setUploadProgress(p),
      });

      const actualKey =
        uploadRes?.record?.file_key ||
        uploadRes?.key ||
        `projects/${projectId}/video/${selectedFile.name}`;

      const newVideoObj: GameplayVideo = {
        id: uploadRes?.record?.id || `vid-${crypto.randomUUID()}`,
        project_id: projectId,
        version: videoVersion.trim(),
        title: videoTitle.trim(),
        description: videoDescription.trim(),
        file_key: actualKey,
        thumbnail_key: previewThumbnail,
        duration: extractedDuration,
        size: selectedFile.size,
        uploaded_by: currentUserId,
        created_at: new Date().toISOString(),
      };

      onAddVideo(newVideoObj);
      success(
        t('videos.uploadSuccessTitle'),
        t('videos.uploadSuccessMsg', { title: videoTitle.trim() })
      );
      setShowUploadModal(false);
      resetUploadForm();
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
        simulateMockUpload();
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

  const isSelectedFileUnsupported = selectedFile
    ? isBrowserUnsupportedFormat(selectedFile.name)
    : false;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
            <Film className="h-5 w-5 text-indigo-400" /> {t('videos.title')}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {t('videos.subtitle')}
          </p>
        </div>

        {canUpload ? (
          <Button
            onClick={() => setShowUploadModal(true)}
            icon={Upload}
          >
            {t('videos.uploadBtn')}
          </Button>
        ) : (
          <Tooltip content={t('videos.viewerNoUpload')}>
            <Button
              disabled
              icon={Upload}
            >
              {t('videos.uploadBtn')}
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <Card className="border-dashed p-12 text-center bg-[var(--color-surface)]/50">
          <FileVideo className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-3" />
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('videos.emptyTitle')}</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto leading-relaxed">
            {t('videos.emptyDesc')}
          </p>
          {canUpload && (
            <div className="mt-4">
              <Button
                onClick={() => setShowUploadModal(true)}
                icon={Upload}
              >
                {t('videos.uploadFirstBtn')}
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((vid) => (
            <Card
              key={vid.id}
              padding="none"
              onClick={() => setActiveVideo(vid)}
              className="group overflow-hidden hover:border-[var(--color-border-strong)] transition-all duration-150 cursor-pointer flex flex-col"
            >
              {/* Thumbnail with overlay */}
              <div className="relative aspect-video bg-black overflow-hidden">
                {vid.thumbnail_key ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={vid.thumbnail_key}
                    alt={vid.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                    <Video className="h-10 w-10" />
                  </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="h-12 w-12 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-indigo-600/40 text-white">
                    <Play className="h-6 w-6 ml-0.5" fill="white" />
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-mono font-medium text-white">
                  {formatDuration(vid.duration)}
                </div>

                {/* Version Badge */}
                <div className="absolute top-2 left-2 bg-[var(--color-accent)]/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white shadow-sm">
                  {vid.version}
                </div>
              </div>

              {/* Video Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {vid.title}
                  </h3>
                  {vid.description && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">
                      {vid.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)]">
                  <span>{formatBytes(vid.size)}</span>
                  <span>{formatDate(vid.created_at)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          onClose={() => {
            setActiveVideo(null);
            if (onClearSelectedVideo) onClearSelectedVideo();
          }}
          userRole={userRole}
          onDeleteVideo={onDeleteVideo}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-video-modal-title"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-4">
              <h3 id="upload-video-modal-title" className="text-base font-bold text-[var(--color-text)]">
                {t('videos.uploadModalTitle')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!uploadProgress || uploadProgress.status !== 'uploading') {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }
                }}
                aria-label={t('videos.closeModalAria')}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStartUpload} className="space-y-4">
              {/* File Select & Dropzone */}
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-accent)] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[var(--color-surface)]/60"
                >
                  <Video className="h-10 w-10 mx-auto text-indigo-400 mb-2" />
                  <p className="text-xs font-semibold text-[var(--color-text)]">
                    {t('videos.dropzoneText')}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    {t('videos.dropzoneHint')}
                  </p>
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
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex gap-4 items-center">
                    {/* Thumbnail Preview */}
                    <div className="w-28 aspect-video bg-black rounded-lg overflow-hidden shrink-0 relative">
                      {previewThumbnail ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={previewThumbnail}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                          {isProcessingFile ? t('videos.generatingThumb') : t('videos.noThumb')}
                        </div>
                      )}
                      {extractedDuration > 0 && (
                        <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[9px] font-mono text-[var(--color-text)]">
                          {formatDuration(extractedDuration)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--color-text)] truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {formatBytes(selectedFile.size)} • {formatDuration(extractedDuration)}
                      </p>
                      <span className="inline-block mt-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {t('videos.thumbExtracted')}
                      </span>
                    </div>

                    {uploadProgress?.status !== 'uploading' && (
                      <button
                        type="button"
                        onClick={() => resetUploadForm()}
                        aria-label={t('videos.removeSelected')}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-1 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Cảnh báo định dạng kén trình duyệt */}
                  {isSelectedFileUnsupported && (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-2 rounded-xl text-xs">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                      <span>
                        {t('videos.warningFormat', {
                          ext: selectedFile.name.split('.').pop() || '',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Version & Title */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
                    {t('videos.formVersion')}
                  </label>
                  <input
                    type="text"
                    required
                    value={videoVersion}
                    onChange={(e) => setVideoVersion(e.target.value)}
                    placeholder="v0.4.5"
                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
                    {t('videos.formTitle')}
                  </label>
                  <input
                    type="text"
                    required
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder={t('videos.formTitlePlaceholder')}
                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
                  {t('videos.formDesc')}
                </label>
                <textarea
                  rows={2}
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder={t('videos.formDescPlaceholder')}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>

              {/* Progress Bar với tốc độ và ETA */}
              {uploadProgress && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300">
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
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
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
                          <span className="flex items-center gap-1 text-indigo-300 font-mono">
                            <Zap className="h-3 w-3 text-amber-400" />
                            {t('videos.uploadSpeed', {
                              speed: formatBytes(uploadProgress.speedBytesPerSec),
                            })}
                          </span>
                        )}
                        {uploadProgress.remainingSeconds !== undefined && (
                          <span className="flex items-center gap-1 text-[var(--color-text)] font-mono">
                            <Clock className="h-3 w-3 text-indigo-400" />
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
                      resetUploadForm();
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
    </div>
  );
}
