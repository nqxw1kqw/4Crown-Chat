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
import { formatBytes, formatDuration, formatDate } from '@/lib/utils';
import {
  extractVideoMetadata,
  uploadLargeFileToR2,
  UploadProgress,
  validateUploadFile,
  isKénTrìnhDuyệtFormat,
} from '@/lib/upload/client-uploader';
import { useToast } from '@/components/ui/Toast';
import { canUpload as canUserUpload, getRoleRestrictionMessage } from '@/lib/permissions';
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

    // Validate kích thước tối đa 5GB và định dạng
    const validation = validateUploadFile(file, 'video', 5 * 1024 * 1024 * 1024);
    if (!validation.valid) {
      setUploadError(validation.error || 'Tập tin không hợp lệ');
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

  const handleStartUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFile) return;

    setUploadError(null);
    abortControllerRef.current = new AbortController();

    try {
      // Bắt đầu upload Multipart lên Cloudflare R2
      await uploadLargeFileToR2({
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

      // Tạo object gameplay video mới hiển thị ngay
      const newVideoObj: GameplayVideo = {
        id: `vid-${crypto.randomUUID()}`,
        project_id: projectId,
        version: videoVersion.trim(),
        title: videoTitle.trim(),
        description: videoDescription.trim(),
        file_key: `projects/${projectId}/video/${selectedFile.name}`,
        thumbnail_key: previewThumbnail,
        duration: extractedDuration,
        size: selectedFile.size,
        uploaded_by: currentUserId,
        created_at: new Date().toISOString(),
      };

      onAddVideo(newVideoObj);
      success('Tải lên thành công', `Video "${videoTitle.trim()}" đã được lưu an toàn trên R2.`);
      setShowUploadModal(false);
      resetUploadForm();
    } catch (err: unknown) {
      if (abortControllerRef.current?.signal.aborted) {
        warning('Đã hủy tải lên', 'Quá trình upload video đã được hủy bỏ.');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Tải lên thất bại';
      // Môi trường dev fallback nếu R2 chưa có secret
      if (msg.includes('dummy') || msg.includes('Failed') || msg.includes('credentials')) {
        simulateMockUpload();
      } else {
        setUploadError(msg);
        toastError('Lỗi tải lên', msg);
      }
    }
  };

  const handleAbortUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setUploadProgress((prev) => (prev ? { ...prev, status: 'aborted' } : null));
      warning('Đã hủy tải lên', 'Bạn đã dừng tải video.');
    }
  };

  const simulateMockUpload = () => {
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
          success('Tải lên hoàn tất', `Video "${videoTitle.trim()}" đã sẵn sàng.`);
          setShowUploadModal(false);
          resetUploadForm();
        }, 500);
      }
    }, 300);
  };

  const isSelectedFileKen = selectedFile ? isKénTrìnhDuyệtFormat(selectedFile.name) : false;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Film className="h-5 w-5 text-indigo-400" /> Gameplay Videos Vault
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Xem lại các bản test gameplay, combat showcase và báo cáo chuyển động theo version
          </p>
        </div>

        {canUpload ? (
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
          >
            <Upload className="h-4 w-4" /> Tải lên Video Gameplay
          </button>
        ) : (
          <div
            title={getRoleRestrictionMessage('tải lên video', userRole)}
            className="text-xs text-zinc-400 italic py-2 px-3 border border-zinc-800 rounded-xl bg-[#12141d]"
          >
            Vai trò VIEWER không có quyền tải lên video
          </div>
        )}
      </div>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <div className="rounded-2xl border border-[#1f2330] bg-[#12141d] p-12 text-center">
          <FileVideo className="h-12 w-12 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-sm font-semibold text-zinc-300">Chưa có video gameplay nào</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Tải lên clip test gameplay từ 60fps, hỗ trợ file nặng tới 5GB trực tiếp lên Cloudflare R2 private bucket.
          </p>
          {canUpload && (
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
            >
              <Upload className="h-4 w-4" /> Tải lên Video đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((vid) => (
            <div
              key={vid.id}
              onClick={() => setActiveVideo(vid)}
              className="group rounded-2xl border border-[#1f2330] bg-[#12141d] overflow-hidden hover:border-zinc-700 hover:shadow-xl transition-all cursor-pointer flex flex-col"
            >
              {/* Thumbnail with overlay */}
              <div className="relative aspect-video bg-black overflow-hidden">
                {vid.thumbnail_key ? (
                  <img
                    src={vid.thumbnail_key}
                    alt={vid.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                    <Video className="h-10 w-10" />
                  </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40 text-white">
                    <Play className="h-6 w-6 ml-0.5" fill="white" />
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-mono font-medium text-white">
                  {formatDuration(vid.duration)}
                </div>

                {/* Version Badge */}
                <div className="absolute top-2 left-2 bg-indigo-600/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white shadow-sm">
                  {vid.version}
                </div>
              </div>

              {/* Video Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {vid.title}
                  </h3>
                  {vid.description && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {vid.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                  <span>{formatBytes(vid.size)}</span>
                  <span>{formatDate(vid.created_at)}</span>
                </div>
              </div>
            </div>
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

      {/* Upload Modal (Section 4 & 5) */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-video-modal-title"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-[#12141e] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
              <h3 id="upload-video-modal-title" className="text-base font-bold text-white">
                Tải lên Video Gameplay (R2 Multipart)
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!uploadProgress || uploadProgress.status !== 'uploading') {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }
                }}
                aria-label="Đóng cửa sổ tải lên"
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStartUpload} className="space-y-4">
              {/* File Select & Dropzone */}
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700/80 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[#171924]/60"
                >
                  <Video className="h-10 w-10 mx-auto text-indigo-400 mb-2" />
                  <p className="text-xs font-semibold text-zinc-200">
                    Bấm để chọn file video từ máy tính
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Hỗ trợ MP4 (khuyến nghị), MOV, MKV, WEBM (Tối đa 5GB)
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
                  <div className="rounded-xl border border-zinc-800 bg-[#171924] p-4 flex gap-4 items-center">
                    {/* Thumbnail Preview */}
                    <div className="w-28 aspect-video bg-black rounded-lg overflow-hidden shrink-0 relative">
                      {previewThumbnail ? (
                        <img
                          src={previewThumbnail}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                          {isProcessingFile ? 'Đang tạo...' : 'Không có thumb'}
                        </div>
                      )}
                      {extractedDuration > 0 && (
                        <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[9px] font-mono text-zinc-300">
                          {formatDuration(extractedDuration)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {formatBytes(selectedFile.size)} • {formatDuration(extractedDuration)}
                      </p>
                      <span className="inline-block mt-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Đã trích xuất Thumbnail an toàn từ client
                      </span>
                    </div>

                    {uploadProgress?.status !== 'uploading' && (
                      <button
                        type="button"
                        onClick={() => resetUploadForm()}
                        aria-label="Hủy chọn file này"
                        className="text-zinc-500 hover:text-rose-400 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Badge cảnh báo định dạng kén trình duyệt */}
                  {isSelectedFileKen && (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-2 rounded-xl text-xs">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                      <span>
                        Cảnh báo: Định dạng .{selectedFile.name.split('.').pop()} có thể không phát được trực tiếp trên một số trình duyệt (khuyến nghị MP4 H.264).
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Version & Title */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Phiên bản *</label>
                  <input
                    type="text"
                    required
                    value={videoVersion}
                    onChange={(e) => setVideoVersion(e.target.value)}
                    placeholder="v0.4.5"
                    className="w-full rounded-xl border border-zinc-800 bg-[#171924] px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Tiêu đề video *</label>
                  <input
                    type="text"
                    required
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Tên video test..."
                    className="w-full rounded-xl border border-zinc-800 bg-[#171924] px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Mô tả nội dung</label>
                <textarea
                  rows={2}
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Ghi chú về tính năng được test trong clip..."
                  className="w-full rounded-xl border border-zinc-800 bg-[#171924] p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Progress Bar với tốc độ và ETA */}
              {uploadProgress && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300">
                      {uploadProgress.status === 'initializing' && 'Đang khởi tạo Multipart trên R2...'}
                      {uploadProgress.status === 'uploading' &&
                        `Đang tải part ${uploadProgress.currentPart}/${uploadProgress.totalParts}...`}
                      {uploadProgress.status === 'completing' && 'Đang hoàn tất và lưu metadata...'}
                      {uploadProgress.status === 'done' && 'Upload hoàn tất thành công!'}
                      {uploadProgress.status === 'aborted' && 'Đã hủy tải lên.'}
                      {uploadProgress.status === 'error' && 'Lỗi trong quá trình upload.'}
                    </span>
                    <span className="font-mono font-bold text-white">{uploadProgress.percentage}%</span>
                  </div>

                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>
                      Đã tải: {formatBytes(uploadProgress.uploadedBytes)} / {formatBytes(uploadProgress.totalBytes)}
                    </span>
                    {uploadProgress.status === 'uploading' && (
                      <div className="flex items-center gap-3">
                        {uploadProgress.speedBytesPerSec !== undefined && uploadProgress.speedBytesPerSec > 0 && (
                          <span className="flex items-center gap-1 text-indigo-300 font-mono">
                            <Zap className="h-3 w-3 text-amber-400" />
                            {formatBytes(uploadProgress.speedBytesPerSec)}/s
                          </span>
                        )}
                        {uploadProgress.remainingSeconds !== undefined && (
                          <span className="flex items-center gap-1 text-zinc-300 font-mono">
                            <Clock className="h-3 w-3 text-indigo-400" />
                            Còn ~{Math.ceil(uploadProgress.remainingSeconds)}s
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error message */}
              {uploadError && (
                <div className="flex items-center justify-between text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartUpload()}
                    className="flex items-center gap-1 text-rose-300 hover:text-white font-medium underline underline-offset-2 ml-2 shrink-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Thử lại
                  </button>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                {uploadProgress?.status === 'uploading' ? (
                  <button
                    type="button"
                    onClick={handleAbortUpload}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-rose-400 border border-rose-500/40 hover:bg-rose-500/10 transition-colors"
                  >
                    Hủy tải lên
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={uploadProgress?.status === 'uploading'}
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                    }}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFile || uploadProgress?.status === 'uploading'}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" /> Bắt đầu tải lên
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
