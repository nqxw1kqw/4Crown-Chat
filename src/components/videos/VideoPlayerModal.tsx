'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';
import { GameplayVideo, ProjectRole } from '@/types/database';
import { formatBytes, formatDuration, formatDate } from '@/lib/utils';

interface VideoPlayerModalProps {
  video: GameplayVideo;
  onClose: () => void;
  userRole: ProjectRole;
  onDeleteVideo?: (videoId: string) => void;
}

export default function VideoPlayerModal({
  video,
  onClose,
  userRole,
  onDeleteVideo,
}: VideoPlayerModalProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Kiểm tra đuôi file xem có phải định dạng kén trình duyệt không
  const isPotentiallyIncompatible =
    video.file_key.toLowerCase().endsWith('.mkv') ||
    video.file_key.toLowerCase().endsWith('.mov');

  const fetchSignedUrl = async () => {
    try {
      setLoadingUrl(true);
      setErrorMsg(null);

      const res = await fetch(`/api/videos/${video.id}/url`);
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
        const res = await fetch(`/api/videos/${video.id}/url`);
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

  const canDelete = userRole === 'OWNER' || userRole === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-zinc-800 bg-[#11131c] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-mono font-bold text-indigo-400">
              {video.version}
            </span>
            <h3 className="text-base font-bold text-white truncate">{video.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Player Area */}
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
          {loadingUrl ? (
            <div className="flex flex-col items-center gap-2 text-zinc-400">
              <RefreshCw className="h-7 w-7 animate-spin text-indigo-500" />
              <span className="text-xs">Đang lấy URL phát trực tiếp an toàn...</span>
            </div>
          ) : errorMsg ? (
            <div className="text-center p-6 text-rose-400 text-sm">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
              {errorMsg}
            </div>
          ) : videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              onError={() => {
                setErrorMsg('Không thể phát video. Link có thể đã hết hạn hoặc định dạng video chưa được hỗ trợ.');
              }}
            />
          ) : null}
        </div>

        {/* Incompatible format warning (Section 5) */}
        {isPotentiallyIncompatible && (
          <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Lưu ý: File video định dạng .mov/.mkv có thể không phát được trên một số trình duyệt (khuyến nghị MP4 H.264).
            </span>
          </div>
        )}

        {/* Video Details & Meta */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {video.description && (
            <p className="text-sm text-zinc-300 bg-[#161824] p-3.5 rounded-xl border border-zinc-800/80">
              {video.description}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-zinc-400">
            <div className="rounded-xl border border-zinc-800/60 bg-[#151722] p-3">
              <span className="text-[11px] text-zinc-500 block mb-1">Thời lượng</span>
              <span className="font-mono font-bold text-zinc-200">
                {formatDuration(video.duration)}
              </span>
            </div>

            <div className="rounded-xl border border-zinc-800/60 bg-[#151722] p-3">
              <span className="text-[11px] text-zinc-500 block mb-1">Dung lượng file</span>
              <span className="font-mono font-bold text-zinc-200">{formatBytes(video.size)}</span>
            </div>

            <div className="rounded-xl border border-zinc-800/60 bg-[#151722] p-3">
              <span className="text-[11px] text-zinc-500 block mb-1">Ngày tải lên</span>
              <span className="font-medium text-zinc-200">{formatDate(video.created_at)}</span>
            </div>

            <div className="rounded-xl border border-zinc-800/60 bg-[#151722] p-3">
              <span className="text-[11px] text-zinc-500 block mb-1">Quyền lưu trữ</span>
              <span className="font-medium text-emerald-400">Cloudflare R2 (Private)</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
            <button
              onClick={fetchSignedUrl}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Làm mới link nếu hết hạn
            </button>

            {canDelete && onDeleteVideo && (
              <button
                onClick={() => {
                  if (confirm('Bạn có chắc muốn xóa video gameplay này không?')) {
                    onDeleteVideo(video.id);
                    onClose();
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                Xóa video
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
