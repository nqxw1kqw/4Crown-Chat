'use client';

import { UploadKind } from '@/types/database';
import { UPLOAD_LIMITS } from '@/lib/constants';

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  currentPart: number;
  totalParts: number;
  speedBytesPerSec: number;
  remainingSeconds: number;
  status: 'idle' | 'initializing' | 'uploading' | 'completing' | 'done' | 'error' | 'aborted';
  errorMessage?: string;
}

export interface VideoMetadataExtraction {
  duration: number;
  thumbnailBlob: Blob | null;
  decodeWarning?: boolean;
}

/**
 * Kiểm tra xem phần mở rộng có kén trình duyệt không (.mov, .mkv)
 */
export function isBrowserUnsupportedFormat(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.mov') || lower.endsWith('.mkv');
}

/**
 * Deprecated alias cho tương thích ngược
 */
export const isKénTrìnhDuyệtFormat = isBrowserUnsupportedFormat;

/**
 * Kiểm tra tính hợp lệ của file trước khi upload
 */
export function validateUploadFile(
  file: File,
  kind: UploadKind,
  maxSizeOverride?: number
): { valid: boolean; error?: string; isBrowserUnsupported?: boolean; isKénTrìnhDuyệt?: boolean } {
  const limitConfig = UPLOAD_LIMITS[kind];
  if (!limitConfig) {
    return { valid: false, error: 'Loại file không được hỗ trợ.' };
  }

  const effectiveMaxSize = maxSizeOverride ?? limitConfig.maxSize;
  if (file.size > effectiveMaxSize) {
    const maxGB = Math.round(effectiveMaxSize / (1024 * 1024 * 1024));
    return {
      valid: false,
      error: `Dung lượng file (${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB) vượt quá giới hạn tối đa ${maxGB}GB cho loại ${kind}.`,
    };
  }

  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const isAllowed = (limitConfig.allowedExtensions as readonly string[]).includes(ext);
  if (!isAllowed) {
    return {
      valid: false,
      error: `Định dạng ${ext} không được hỗ trợ. Các định dạng hợp lệ: ${limitConfig.allowedExtensions.join(', ')}.`,
    };
  }

  const unsupported = isBrowserUnsupportedFormat(file.name);
  return {
    valid: true,
    isBrowserUnsupported: unsupported,
    isKénTrìnhDuyệt: unsupported,
  };
}

/**
 * 1. Trích xuất duration và thumbnail từ client bằng HTML5 Video và Canvas
 * An toàn với timeout: Nếu trình duyệt không decode được file (như MKV, MOV), không bị treo popup!
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadataExtraction> {
  return new Promise((resolve) => {
    let hasResolved = false;

    // Timeout an toàn sau 3.5 giây
    const timeoutTimer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        cleanup();
        resolve({
          duration: 0,
          thumbnailBlob: null,
          decodeWarning: isBrowserUnsupportedFormat(file.name),
        });
      }
    }, 3500);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
    } catch {
      clearTimeout(timeoutTimer);
      return resolve({ duration: 0, thumbnailBlob: null });
    }

    const cleanup = () => {
      clearTimeout(timeoutTimer);
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      }
    };

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      // Tua tới giây thứ 1 hoặc 10% clip
      const targetTime = Math.min(1.0, Math.max(0.1, duration * 0.1));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      if (hasResolved) return;
      hasResolved = true;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || 640, 1280);
        const scale = canvas.width / (video.videoWidth || 640);
        canvas.height = (video.videoHeight || 360) * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              cleanup();
              resolve({
                duration: video.duration || 0,
                thumbnailBlob: blob,
                decodeWarning: false,
              });
            },
            'image/jpeg',
            0.85
          );
        } else {
          cleanup();
          resolve({ duration: video.duration || 0, thumbnailBlob: null });
        }
      } catch (err) {
        console.warn('Lỗi tạo thumbnail từ canvas:', err);
        cleanup();
        resolve({ duration: video.duration || 0, thumbnailBlob: null });
      }
    };

    video.onerror = () => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();
      resolve({
        duration: 0,
        thumbnailBlob: null,
        decodeWarning: isBrowserUnsupportedFormat(file.name),
      });
    };
  });
}

/**
 * 2. IndexedDB Helper để lưu vết các Part đã upload thành công (hỗ trợ Resume)
 */
const DB_NAME = 'GameTeamHub_Uploads';
const STORE_NAME = 'resumable_parts';

function openUploadDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB không được hỗ trợ'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'uploadId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePartProgress(
  uploadId: string,
  key: string,
  partNumber: number,
  etag: string
) {
  try {
    const db = await openUploadDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const getReq = store.get(uploadId);
    getReq.onsuccess = () => {
      const record = getReq.result || {
        uploadId,
        key,
        parts: [],
      };
      const existingIdx = record.parts.findIndex((p: { PartNumber: number }) => p.PartNumber === partNumber);
      if (existingIdx >= 0) {
        record.parts[existingIdx] = { PartNumber: partNumber, ETag: etag };
      } else {
        record.parts.push({ PartNumber: partNumber, ETag: etag });
      }
      store.put(record);
    };
  } catch (err) {
    console.warn('Lỗi lưu IndexedDB upload progress:', err);
  }
}

export async function clearUploadProgress(uploadId: string) {
  try {
    const db = await openUploadDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(uploadId);
  } catch (err) {
    console.warn('Lỗi xóa IndexedDB upload progress:', err);
  }
}

/**
 * 3. Client Uploader: chia part, upload 3-4 luồng song song, đo tốc độ/ETA và hỗ trợ AbortController
 */
export async function uploadLargeFileToR2({
  projectId,
  file,
  kind,
  extraMetadata = {},
  onProgress,
  signal,
  concurrency = 3,
}: {
  projectId: string;
  file: File;
  kind: UploadKind;
  extraMetadata?: Record<string, unknown>;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  concurrency?: number;
}) {
  let uploadId = '';
  let objectKey = '';
  let uploadedBytes = 0;
  const startTime = performance.now();

  const updateProgress = (state: Partial<UploadProgress>) => {
    if (onProgress) {
      const elapsedSec = (performance.now() - startTime) / 1000;
      const speed = elapsedSec > 0.5 ? uploadedBytes / elapsedSec : 0;
      const remainingBytes = Math.max(0, file.size - uploadedBytes);
      const eta = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;

      onProgress({
        uploadedBytes,
        totalBytes: file.size,
        percentage: 0,
        currentPart: 0,
        totalParts: 1,
        speedBytesPerSec: speed,
        remainingSeconds: eta,
        status: 'uploading',
        ...state,
      });
    }
  };

  updateProgress({ status: 'initializing' });

  // Kiểm tra nếu đã bị abort từ trước
  if (signal?.aborted) {
    updateProgress({ status: 'aborted' });
    throw new Error('Upload đã bị hủy.');
  }

  // A. Trích xuất video metadata & upload thumbnail nếu là video
  let thumbnailKey: string | null = null;
  let videoDuration = 0;

  if (kind === 'video') {
    const { duration, thumbnailBlob } = await extractVideoMetadata(file);
    videoDuration = duration;

    if (thumbnailBlob && !signal?.aborted) {
      try {
        const thumbRes = await fetch('/api/uploads/thumbnail-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
          signal,
        });
        if (thumbRes.ok) {
          const thumbData = await thumbRes.json();
          await fetch(thumbData.uploadUrl, {
            method: 'PUT',
            body: thumbnailBlob,
            headers: { 'Content-Type': 'image/jpeg' },
            signal,
          });
          thumbnailKey = thumbData.thumbnailKey;
        }
      } catch (thumbErr) {
        console.warn('Không thể upload thumbnail:', thumbErr);
      }
    }
  }

  if (signal?.aborted) {
    updateProgress({ status: 'aborted' });
    throw new Error('Upload đã bị hủy.');
  }

  // B. Gọi /api/uploads/init
  const initRes = await fetch('/api/uploads/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      filename: file.name,
      size: file.size,
      mime: file.type,
      kind,
    }),
    signal,
  });

  if (!initRes.ok) {
    const errData = await initRes.json();
    throw new Error(errData.error || 'Khởi tạo upload thất bại.');
  }

  const initData = await initRes.json();
  uploadId = initData.uploadId;
  objectKey = initData.key;
  const partSize = initData.partSize;
  const totalParts = initData.totalParts;
  const partUrls = initData.partUrls;

  const urlMap = new Map<number, string>();
  for (const item of partUrls) {
    urlMap.set(item.partNumber, item.url);
  }

  // Helper dọn dẹp khi bị Abort
  const abortUploadOnServer = async () => {
    if (uploadId && objectKey) {
      try {
        await fetch('/api/uploads/abort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, uploadId, key: objectKey }),
        });
        await clearUploadProgress(uploadId);
      } catch (e) {
        console.warn('Lỗi gọi abort API:', e);
      }
    }
  };

  signal?.addEventListener('abort', () => {
    abortUploadOnServer();
    updateProgress({ status: 'aborted' });
  });

  // C. Danh sách completed parts
  const completedParts: { PartNumber: number; ETag: string }[] = [];

  const getUrlForPart = async (pNum: number): Promise<string> => {
    if (urlMap.has(pNum)) return urlMap.get(pNum)!;

    const res = await fetch('/api/uploads/part-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, uploadId, key: objectKey, partNumber: pNum }),
      signal,
    });
    if (!res.ok) throw new Error(`Không lấy được URL cho part ${pNum}`);
    const data = await res.json();
    urlMap.set(pNum, data.url);
    return data.url;
  };

  // D. Danh sách công việc cho từng part
  const tasks: number[] = [];
  for (let i = 1; i <= totalParts; i++) {
    tasks.push(i);
  }

  const uploadPartWorker = async (partNumber: number) => {
    if (signal?.aborted) return;

    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, file.size);
    const chunk = file.slice(start, end);
    const chunkSize = chunk.size;

    const presignedUrl = await getUrlForPart(partNumber);

    if (signal?.aborted) return;

    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: chunk,
      signal,
    });

    if (!putRes.ok) {
      throw new Error(`Upload part ${partNumber} thất bại: HTTP ${putRes.status}`);
    }

    const etag = putRes.headers.get('ETag')?.replace(/"/g, '') || `etag-${partNumber}`;
    completedParts.push({ PartNumber: partNumber, ETag: `"${etag}"` });

    await savePartProgress(uploadId, objectKey, partNumber, etag);

    uploadedBytes += chunkSize;
    updateProgress({
      uploadedBytes,
      totalBytes: file.size,
      percentage: Math.min(100, Math.round((uploadedBytes / file.size) * 100)),
      currentPart: completedParts.length,
      totalParts,
      status: 'uploading',
    });
  };

  // E. Chạy đa luồng song song
  let currentIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, totalParts) }, async () => {
    while (currentIndex < tasks.length && !signal?.aborted) {
      const taskIndex = currentIndex++;
      const partNum = tasks[taskIndex];
      await uploadPartWorker(partNum);
    }
  });

  await Promise.all(workers);

  if (signal?.aborted) {
    updateProgress({ status: 'aborted' });
    throw new Error('Upload đã bị hủy.');
  }

  // F. Hoàn tất upload
  updateProgress({ status: 'completing', percentage: 100 });

  const completeRes = await fetch('/api/uploads/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      uploadId,
      key: objectKey,
      parts: completedParts,
      kind,
      size: file.size,
      metadata: {
        filename: file.name,
        mime: file.type,
        title: (extraMetadata.title as string) || file.name,
        description: (extraMetadata.description as string) || '',
        version: (extraMetadata.version as string) || '1.0',
        thumbnailKey,
        duration: videoDuration,
        folder: (extraMetadata.folder as string) || (kind === 'build' ? 'builds' : 'general'),
        linkedTaskId: (extraMetadata.linkedTaskId as string) || null,
      },
    }),
    signal,
  });

  if (!completeRes.ok) {
    const completeErr = await completeRes.json();
    throw new Error(completeErr.error || 'Lỗi khi hoàn tất upload.');
  }

  await clearUploadProgress(uploadId);

  const result = await completeRes.json();
  updateProgress({ status: 'done', percentage: 100 });

  return result;
}
