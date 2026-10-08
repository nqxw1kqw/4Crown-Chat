'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, RefreshCw, Trash2, User } from 'lucide-react';
import { GameplayVideo, ProjectRole } from '@/types/database';
import { useLocale } from '@/i18n/useLocale';
import { Button } from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { getSlotDisplayName } from '@/lib/profile';

interface VideoPlayerModalProps {
  video: GameplayVideo;
  onClose: () => void;
  userRole?: ProjectRole;
  onDeleteVideo?: (videoId: string) => void;
  profileNames?: Record<string, string>;
}

export default function VideoPlayerModal({
  video,
  onClose,
  onDeleteVideo,
  profileNames = {},
}: VideoPlayerModalProps) {
  const { t, formatBytes, formatDuration, formatDate } = useLocale();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Bắt phím Esc để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showDeleteConfirm) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showDeleteConfirm]);

  const isPotentiallyIncompatible =
    video.file_key.toLowerCase().endsWith('.mkv') ||
    video.file_key.toLowerCase().endsWith('.mov');

  const fetchSignedUrl = async () => {
    try {
      setLoadingUrl(true);
      setErrorMsg(null);

      const res = await fetch(`/api/videos/${video.id}/url?key=${encodeURIComponent(video.file_key)}`);
      if (res.ok) {
        const data = await res.json();
        setVideoUrl(data.videoUrl);
      } else {
        if (video.file_key.startsWith('http')) {
          setVideoUrl(video.file_key);
        } else {
          setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
        }
      }
    } catch {
      setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    } finally {
      setLoadingUrl(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/videos/${video.id}/url?key=${encodeURIComponent(video.file_key)}`);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setVideoUrl(data.videoUrl);
        } else {
          if (video.file_key.startsWith('http')) {
            setVideoUrl(video.file_key);
          } else {
            setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
          }
        }
      } catch {
        if (isMounted) {
          setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
        }
      } finally {
        if (isMounted) setLoadingUrl(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [video.id, video.file_key]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-player-modal-title"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface)]">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <span className="rounded-lg bg-[var(--color-accent)]/20 px-2 py-0.5 text-xs font-mono font-bold text-indigo-400">
              {video.version}
            </span>
            <h3 id="video-player-modal-title" className="text-base font-bold text-[var(--color-text)] truncate">
              {video.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('videoPlayer.closeAria')}
            className="rounded-xl p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Player Area */}
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
          {loadingUrl ? (
            <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
              <RefreshCw className="h-7 w-7 animate-spin text-[var(--color-accent)]" />
              <span className="text-xs">{t('videoPlayer.loadingUrl')}</span>
            </div>
          ) : errorMsg ? (
            <div className="text-center p-6 text-[var(--color-danger)] text-sm">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-[var(--color-danger)]" />
              {errorMsg}
            </div>
          ) : videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              preload="none"
              title={video.title}
              aria-label={video.title}
              className="w-full h-full object-contain"
              onError={() => {
                setErrorMsg(t('videoPlayer.playError'));
              }}
            />
          ) : null}
        </div>

        {/* Incompatible format warning */}
        {isPotentiallyIncompatible && (
          <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              {t('videoPlayer.incompatibleWarning')}
            </span>
          </div>
        )}

        {/* Video Details & Meta */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {video.description && (
            <p className="text-sm text-[var(--color-text)] bg-[var(--color-surface)] p-3.5 rounded-xl border border-[var(--color-border)] leading-relaxed">
              {video.description}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs text-[var(--color-text-muted)]">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[11px] text-[var(--color-text-muted)] block mb-1">{t('videos.duration')}</span>
              <span className="font-mono font-bold text-[var(--color-text)]">
                {formatDuration(video.duration)}
              </span>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[11px] text-[var(--color-text-muted)] block mb-1">{t('videos.fileSize')}</span>
              <span className="font-mono font-bold text-[var(--color-text)]">{formatBytes(video.size)}</span>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[11px] text-[var(--color-text-muted)] block mb-1">{t('videos.uploadDate')}</span>
              <span className="font-medium text-[var(--color-text)]">{formatDate(video.created_at)}</span>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[11px] text-[var(--color-text-muted)] block mb-1">{t('videos.uploader')}</span>
              <span className="font-medium text-[var(--color-text)] flex items-center gap-1.5 truncate">
                <User className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                {getSlotDisplayName(video.uploaded_by, profileNames, t('assignee.unknown'))}
              </span>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[11px] text-[var(--color-text-muted)] block mb-1">{t('videos.storage')}</span>
              <span className="font-medium text-[var(--color-success)] truncate">{t('videos.storageValue')}</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={fetchSignedUrl}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {t('videoPlayer.refreshLink')}
            </button>

            {onDeleteVideo && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                icon={Trash2}
              >
                {t('videoPlayer.deleteVideo')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ConfirmDialog khi xóa video */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('videoPlayer.deleteConfirmTitle')}
        description={t('videoPlayer.deleteConfirmDesc')}
        targetName={`"${video.title}" (${video.version})`}
        confirmLabel={t('videoPlayer.deleteConfirmBtn')}
        cancelLabel={t('common.cancel')}
        isDangerous={true}
        onConfirm={() => {
          if (onDeleteVideo) {
            onDeleteVideo(video.id);
            setShowDeleteConfirm(false);
            onClose();
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
