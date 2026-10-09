'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, RefreshCw, Trash2, Link2, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import type { GameplayVideo } from '@/types/database';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { isBrowserUnsupportedFormat } from '@/lib/upload/client-uploader';
import { useAppData } from '@/components/providers/AppDataProvider';
import { useLocale } from '@/i18n/useLocale';
import { TranslationKey } from '@/i18n/dictionaries/vi';
import { Button } from '@/components/ui/Button';
import ConfirmDialog from '@/components/common/confirm-dialog';
import MemberAvatar from '@/components/common/member-avatar';
import { useToast } from '@/components/ui/Toast';

interface VideoPlayerModalProps {
  video: GameplayVideo;
  onClose: () => void;
}

interface SignedVideoResponse {
  videoUrl: string;
  thumbnailUrl: string | null;
}

export default function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps) {
  const { t, formatBytes, formatDuration, formatDate } = useLocale();
  const { deleteVideo, tasks, members, memberName, can, refresh } = useAppData();
  const { success, error: toastError } = useToast();

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !showDeleteConfirm) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showDeleteConfirm]);

  const [reloadToken, setReloadToken] = useState(0);

  const refreshSignedUrl = () => {
    setLoadingUrl(true);
    setReloadToken((token) => token + 1);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch<SignedVideoResponse>(`/api/videos/${video.id}/url`);
        if (cancelled) return;
        setVideoUrl(data.videoUrl);
        setErrorMsg(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.code === 'not_found') {
          // Reload the gallery so a deleted record doesn't stay playable/deletable.
          void refresh().catch(() => undefined);
        }
        setVideoUrl(null);
        setErrorMsg(
          err instanceof ApiClientError ? t(`apiError.${err.code}` as TranslationKey) : t('apiError.system')
        );
      } finally {
        if (!cancelled) setLoadingUrl(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [video.id, reloadToken, t, refresh]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/videos/${video.id}`);
      success(t('videoPlayer.linkCopiedTitle'), t('videoPlayer.linkCopiedMsg'));
    } catch {
      toastError(t('videoPlayer.linkCopiedTitle'), t('videoPlayer.linkCopyFailedMsg'));
    }
  };

  const linkedTask = tasks.find((task) => task.id === video.linked_task_id);
  const uploader = members.find((member) => member.id === video.uploaded_by);
  const uploaderName = memberName(video.uploaded_by) ?? t('assignee.unknown');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 p-4 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-player-modal-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-white px-6 py-4">
          <div className="flex min-w-0 items-center gap-3 pr-4">
            <span className="rounded-md bg-[var(--color-brand-soft)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--color-brand-hover)]">
              {video.version}
            </span>
            <h3 id="video-player-modal-title" className="truncate text-[15px] font-semibold text-[var(--color-text)]">
              {video.title}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label={t('videoPlayer.copyLinkAria')}
              title={t('videoPlayer.copyLinkAria')}
              className="cursor-pointer rounded-md p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-brand-hover)]"
            >
              <Link2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('videoPlayer.closeAria')}
              className="cursor-pointer rounded-md p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-black">
          {loadingUrl ? (
            <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
              <RefreshCw className="size-7 animate-spin text-[var(--color-brand)]" />
              <span className="text-xs">{t('videoPlayer.loadingUrl')}</span>
            </div>
          ) : errorMsg ? (
            <div className="max-w-md p-6 text-center text-sm text-[var(--color-danger)]">
              <AlertTriangle className="mx-auto mb-2 size-8" />
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
              className="h-full w-full object-contain"
              onError={() => setErrorMsg(t('videoPlayer.playError'))}
            />
          ) : null}
        </div>

        {isBrowserUnsupportedFormat(video.file_key) && (
          <div className="flex items-center gap-2 border-b border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] px-6 py-2.5 text-xs text-[var(--color-warning)]">
            <AlertTriangle className="size-4 shrink-0 text-[var(--color-warning)]" />
            <span>{t('videoPlayer.incompatibleWarning')}</span>
          </div>
        )}

        <div className="space-y-4 overflow-y-auto p-6">
          {video.description && (
            <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 text-sm leading-relaxed text-[var(--color-text)]">
              {video.description}
            </p>
          )}

          {linkedTask && (
            <Link
              href={`/tasks/${linkedTask.id}`}
              onClick={onClose}
              className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-xs text-[var(--color-brand-hover)] transition-colors hover:border-[var(--color-border-strong)]"
            >
              <FolderKanban className="size-4 shrink-0" />
              <span className="truncate">
                {t('videoPlayer.linkedTask')}: {linkedTask.title}
              </span>
            </Link>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs text-[var(--color-text-muted)] sm:grid-cols-4">
            <MetaBox label={t('videos.duration')} value={formatDuration(video.duration)} mono />
            <MetaBox label={t('videos.fileSize')} value={formatBytes(video.size)} mono />
            <MetaBox label={t('videos.uploadDate')} value={formatDate(video.created_at)} />
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="mb-1 block text-[11px] text-[var(--color-text-muted)]">{t('videos.uploader')}</span>
              <span className="flex items-center gap-1.5 font-medium text-[var(--color-text)]">
                <MemberAvatar slot={uploader?.slot} name={uploaderName} size="xs" />
                <span className="truncate">{uploaderName}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
            <button
              type="button"
              onClick={refreshSignedUrl}
              className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--color-brand)] transition-colors hover:text-[var(--color-brand-hover)]"
            >
              <RefreshCw className="size-3.5" /> {t('videoPlayer.refreshLink')}
            </button>

            {can.manageRecord(video.uploaded_by) && (
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="size-4" />
                {t('videoPlayer.deleteVideo')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('videoPlayer.deleteConfirmTitle')}
        description={t('videoPlayer.deleteConfirmDesc')}
        targetName={`"${video.title}" (${video.version})`}
        confirmLabel={t('videoPlayer.deleteConfirmBtn')}
        cancelLabel={t('common.cancel')}
        isDangerous={true}
        busy={deleting}
        onConfirm={async () => {
          if (deleting) return;
          setDeleting(true);
          try {
            await deleteVideo(video.id);
            setShowDeleteConfirm(false);
            success(t('videos.deleteSuccessTitle'), t('videos.deleteSuccessMsg', { title: video.title }));
            onClose();
          } catch (err) {
            toastError(
              t('videos.deleteFailedTitle'),
              err instanceof ApiClientError
                ? t(`apiError.${err.code}` as TranslationKey)
                : t('apiError.system')
            );
          } finally {
            setDeleting(false);
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

function MetaBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <span className="mb-1 block text-[11px] text-[var(--color-text-muted)]">{label}</span>
      <span
        className={`block truncate text-[var(--color-text)] ${mono ? 'font-mono font-bold' : 'font-medium'}`}
      >
        {value}
      </span>
    </div>
  );
}
