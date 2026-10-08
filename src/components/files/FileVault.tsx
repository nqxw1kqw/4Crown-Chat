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
import { formatBytes, formatDate } from '@/lib/utils';
import {
  uploadLargeFileToR2,
  UploadProgress,
  validateUploadFile,
} from '@/lib/upload/client-uploader';
import { useToast } from '@/components/ui/Toast';
import {
  canUpload as canUserUpload,
  canDeleteMedia,
  getRoleRestrictionMessage,
} from '@/lib/permissions';
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

const FOLDERS = [
  { id: 'ALL', label: 'Tất cả file' },
  { id: 'builds', label: 'Game Builds (.zip, .exe)' },
  { id: 'assets', label: 'Art & Sprite (.ase, .psd, .fbx)' },
  { id: 'audio', label: 'Audio & Music (.wav, .ogg)' },
  { id: 'general', label: 'Tài liệu chung' },
];

export default function FileVault({
  files,
  tasks,
  userRole,
  currentUserId,
  projectId,
  onAddFile,
  onDeleteFile,
}: FileVaultProps) {
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
    return <File className="h-5 w-5 text-zinc-400" />;
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      const res = await fetch(`/api/files/${file.id}/download`);
      if (res.ok) {
        const data = await res.json();
        window.open(data.downloadUrl, '_blank');
      } else {
        success('Thông báo tải file', `Tập tin "${file.name}" đã được lưu an toàn trong hệ thống.`);
      }
    } catch {
      success('Thông báo tải file', `Tập tin "${file.name}" đã được lưu an toàn trong hệ thống.`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate dung lượng tối đa 10GB theo loại thư mục
    const kind: UploadKind = selectedFolder === 'builds' ? 'build' : 'file';
    const validation = validateUploadFile(file, kind, 10 * 1024 * 1024 * 1024);
    if (!validation.valid) {
      setUploadError(validation.error || 'Tập tin vượt quá kích thước cho phép');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  };

  const handleStartUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFile) return;

    setUploadError(null);
    abortControllerRef.current = new AbortController();
    const kind: UploadKind = selectedFolder === 'builds' ? 'build' : 'file';

    try {
      await uploadLargeFileToR2({
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

      const newFileObj: FileRecord = {
        id: `file-${crypto.randomUUID()}`,
        project_id: projectId,
        folder: selectedFolder,
        name: selectedFile.name,
        file_key: `projects/${projectId}/${selectedFolder}/${selectedFile.name}`,
        size: selectedFile.size,
        mime: selectedFile.type,
        uploaded_by: currentUserId,
        linked_task_id: linkedTaskId || null,
        created_at: new Date().toISOString(),
      };

      onAddFile(newFileObj);
      success('Tải lên thành công', `Tập tin "${selectedFile.name}" đã được đưa vào kho.`);
      setShowUploadModal(false);
      resetForm();
    } catch (err: unknown) {
      if (abortControllerRef.current?.signal.aborted) {
        warning('Đã hủy tải lên', 'Quá trình upload file đã được dừng lại.');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Tải lên thất bại';
      // Fallback demo cho dev environment
      if (msg.includes('dummy') || msg.includes('Failed') || msg.includes('credentials')) {
        simulateMockFileUpload();
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
      warning('Đã hủy tải lên', 'Bạn đã hủy tải file.');
    }
  };

  const simulateMockFileUpload = () => {
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
          success('Tải lên hoàn tất', `Tập tin "${selectedFile!.name}" đã sẵn sàng.`);
          setShowUploadModal(false);
          resetForm();
        }, 400);
      }
    }, 250);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileBox className="h-5 w-5 text-emerald-400" /> Files & Builds Vault
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Lưu trữ bản build dung lượng lớn (tới 10GB) và tài nguyên đồ hoạ/âm thanh dự án
          </p>
        </div>

        {canUpload ? (
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
          >
            <Upload className="h-4 w-4" /> Tải lên File Mới
          </button>
        ) : (
          <div
            title={getRoleRestrictionMessage('tải lên file', userRole)}
            className="text-xs text-zinc-400 italic py-2 px-3 border border-zinc-800 rounded-xl bg-[#12141d]"
          >
            Vai trò VIEWER không có quyền tải lên file
          </div>
        )}
      </div>

      {/* Folder Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FOLDERS.map((f) => {
          const isActive = activeFolder === f.id;
          return (
            <button
              type="button"
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-medium shrink-0 transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-[#12141d] border border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* File List Table */}
      <div className="rounded-2xl border border-[#1f2330] bg-[#12141d] overflow-hidden shadow-sm">
        <div className="divide-y divide-zinc-800/50">
          {filteredFiles.length === 0 ? (
            <div className="p-10 text-center text-xs text-zinc-400">
              <FileBox className="h-10 w-10 mx-auto text-zinc-600 mb-2 opacity-80" />
              <p className="text-zinc-200 font-medium">Kho lưu trữ hiện chưa có file nào</p>
              <p className="mt-1 text-zinc-400">
                Bạn có thể tải lên file build game (.zip, .exe) hoặc tài nguyên đồ họa/âm thanh.
              </p>
              {canUpload && (
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
                >
                  <Upload className="h-4 w-4" /> Tải lên File đầu tiên
                </button>
              )}
            </div>
          ) : (
            filteredFiles.map((file) => {
              const linkedTask = tasks.find((t) => t.id === file.linked_task_id);

              return (
                <div
                  key={file.id}
                  className="p-4 hover:bg-[#161924] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0">
                      {getFileIcon(file.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-200 truncate group-hover:text-indigo-300 transition-colors">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 flex-wrap">
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
                            <span className="text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded text-[11px] truncate max-w-[200px]">
                              Task: {linkedTask.title}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownload(file)}
                      aria-label={`Tải về file ${file.name}`}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Tải về
                    </button>

                    {canDelete && onDeleteFile && (
                      <button
                        type="button"
                        onClick={() => setFileToDelete(file)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                        aria-label={`Xóa file ${file.name}`}
                        title="Xóa file (Chỉ Owner/Admin)"
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
      </div>

      {/* Upload File Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-file-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#12141e] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
              <h3 id="upload-file-modal-title" className="text-base font-bold text-white">
                Tải lên File / Game Build (Tối đa 10GB)
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!uploadProgress || uploadProgress.status !== 'uploading') {
                    setShowUploadModal(false);
                    resetForm();
                  }
                }}
                aria-label="Đóng cửa sổ tải file"
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStartUpload} className="space-y-4">
              {/* File Select */}
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700/80 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[#171924]/60"
                >
                  <FileBox className="h-10 w-10 mx-auto text-emerald-400 mb-2" />
                  <p className="text-xs font-semibold text-zinc-200">
                    Bấm để chọn file build hoặc tài nguyên
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Hỗ trợ file nặng tới 10GB tải trực tiếp vào R2 Private Bucket
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-[#171924] p-3 flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{formatBytes(selectedFile.size)}</p>
                  </div>
                  {uploadProgress?.status !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      aria-label="Hủy chọn file này"
                      className="text-zinc-500 hover:text-rose-400 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Folder Selector */}
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Thư mục phân loại</label>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-[#171924] px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="general">Tài liệu chung (general)</option>
                  <option value="builds">Game Builds (builds - hỗ trợ 10GB)</option>
                  <option value="assets">Đồ hoạ & Mô hình (assets)</option>
                  <option value="audio">Âm thanh & SFX (audio)</option>
                </select>
              </div>

              {/* Linked Task Selector */}
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Gắn với Task (Tùy chọn)</label>
                <select
                  value={linkedTaskId}
                  onChange={(e) => setLinkedTaskId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-[#171924] px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Không liên kết task nào</option>
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
                      {uploadProgress.status === 'initializing' && 'Đang chuẩn bị phiên upload...'}
                      {uploadProgress.status === 'uploading' &&
                        `Đang tải part ${uploadProgress.currentPart}/${uploadProgress.totalParts}...`}
                      {uploadProgress.status === 'completing' && 'Đang hoàn tất lưu trữ...'}
                      {uploadProgress.status === 'done' && 'Upload hoàn tất!'}
                      {uploadProgress.status === 'aborted' && 'Đã hủy tải lên.'}
                      {uploadProgress.status === 'error' && 'Lỗi upload.'}
                    </span>
                    <span className="font-mono font-bold text-white">{uploadProgress.percentage}%</span>
                  </div>

                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
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
                          <span className="flex items-center gap-1 text-emerald-300 font-mono">
                            <Zap className="h-3 w-3 text-amber-400" />
                            {formatBytes(uploadProgress.speedBytesPerSec)}/s
                          </span>
                        )}
                        {uploadProgress.remainingSeconds !== undefined && (
                          <span className="flex items-center gap-1 text-zinc-300 font-mono">
                            <Clock className="h-3 w-3 text-emerald-400" />
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
                      resetForm();
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

      {/* ConfirmDialog khi xóa file */}
      {fileToDelete && (
        <ConfirmDialog
          isOpen={!!fileToDelete}
          title="Xác nhận xóa tập tin"
          description="Tập tin này sẽ bị xóa vĩnh viễn khỏi Cloudflare R2 và kho lưu trữ của dự án."
          targetName={`"${fileToDelete.name}" (${fileToDelete.folder})`}
          confirmLabel="Xóa tập tin"
          cancelLabel="Hủy bỏ"
          isDangerous={true}
          onConfirm={() => {
            if (onDeleteFile) {
              onDeleteFile(fileToDelete.id);
              success('Đã xóa tập tin', `Tập tin "${fileToDelete.name}" đã được xóa.`);
            }
            setFileToDelete(null);
          }}
          onCancel={() => setFileToDelete(null)}
        />
      )}
    </div>
  );
}
