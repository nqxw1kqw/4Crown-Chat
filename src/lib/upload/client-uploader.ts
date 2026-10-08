'use client';

import { UploadKind } from '@/types/database';

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  currentPart: number;
  totalParts: number;
  status: 'idle' | 'initializing' | 'uploading' | 'completing' | 'done' | 'error' | 'aborted';
  errorMessage?: string;
}

export interface VideoMetadataExtraction {
  duration: number;
  thumbnailBlob: Blob | null;
}

/**
 * 1. Trích xuất duration và thumbnail từ client bằng HTML5 Video và Canvas
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadataExtraction> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      // Tua tới giây thứ 1 hoặc 10% clip
      const targetTime = Math.min(1.0, Math.max(0.1, duration * 0.1));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
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
      cleanup();
      resolve({ duration: 0, thumbnailBlob: null });
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
      // Cập nhật part
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
 * 3. Client Uploader: chia part, upload 3-4 luồng song song, bắt lỗi và resume
 */
export async function uploadLargeFileToR2({
  projectId,
  file,
  kind,
  extraMetadata = {},
  onProgress,
  concurrency = 3,
}: {
  projectId: string;
  file: File;
  kind: UploadKind;
  extraMetadata?: Record<string, unknown>;
  onProgress?: (progress: UploadProgress) => void;
  concurrency?: number;
}) {
  const updateProgress = (state: Partial<UploadProgress>) => {
    if (onProgress) {
      onProgress({
        uploadedBytes: 0,
        totalBytes: file.size,
        percentage: 0,
        currentPart: 0,
        totalParts: 1,
        status: 'uploading',
        ...state,
      });
    }
  };

  updateProgress({ status: 'initializing' });

  // A. Trích xuất video metadata & upload thumbnail nếu là video
  let thumbnailKey: string | null = null;
  let videoDuration = 0;

  if (kind === 'video') {
    const { duration, thumbnailBlob } = await extractVideoMetadata(file);
    videoDuration = duration;

    if (thumbnailBlob) {
      try {
        const thumbRes = await fetch('/api/uploads/thumbnail-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        });
        if (thumbRes.ok) {
          const thumbData = await thumbRes.json();
          await fetch(thumbData.uploadUrl, {
            method: 'PUT',
            body: thumbnailBlob,
            headers: { 'Content-Type': 'image/jpeg' },
          });
          thumbnailKey = thumbData.thumbnailKey;
        }
      } catch (thumbErr) {
        console.warn('Không thể upload thumbnail:', thumbErr);
      }
    }
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
  });

  if (!initRes.ok) {
    const errData = await initRes.json();
    throw new Error(errData.error || 'Khởi tạo upload thất bại');
  }

  const { uploadId, key, partSize, totalParts, partUrls } = await initRes.json();

  const urlMap = new Map<number, string>();
  for (const item of partUrls) {
    urlMap.set(item.partNumber, item.url);
  }

  // C. Danh sách completed parts
  const completedParts: { PartNumber: number; ETag: string }[] = [];
  const partSizesMap = new Map<number, number>();

  let uploadedBytes = 0;

  // Helper lấy URL của part (nếu chưa có trong batch ban đầu thì gọi endpoint /part-url)
  const getUrlForPart = async (pNum: number): Promise<string> => {
    if (urlMap.has(pNum)) return urlMap.get(pNum)!;

    const res = await fetch('/api/uploads/part-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, uploadId, key, partNumber: pNum }),
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
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, file.size);
    const chunk = file.slice(start, end);
    const chunkSize = chunk.size;
    partSizesMap.set(partNumber, chunkSize);

    const presignedUrl = await getUrlForPart(partNumber);

    // Thực hiện PUT trực tiếp lên Cloudflare R2
    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: chunk,
    });

    if (!putRes.ok) {
      throw new Error(`Upload part ${partNumber} thất bại: HTTP ${putRes.status}`);
    }

    const etag = putRes.headers.get('ETag')?.replace(/"/g, '') || `etag-${partNumber}`;
    completedParts.push({ PartNumber: partNumber, ETag: `"${etag}"` });

    // Lưu IndexedDB
    await savePartProgress(uploadId, key, partNumber, etag);

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

  // E. Chạy đa luồng song song (concurrency: 3 hoặc 4)
  let currentIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, totalParts) }, async () => {
    while (currentIndex < tasks.length) {
      const taskIndex = currentIndex++;
      const partNum = tasks[taskIndex];
      await uploadPartWorker(partNum);
    }
  });

  await Promise.all(workers);

  // F. Hoàn tất upload
  updateProgress({ status: 'completing', percentage: 100 });

  const completeRes = await fetch('/api/uploads/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      uploadId,
      key,
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
  });

  if (!completeRes.ok) {
    const completeErr = await completeRes.json();
    throw new Error(completeErr.error || 'Lỗi khi hoàn tất upload');
  }

  // Dọn dẹp IndexedDB
  await clearUploadProgress(uploadId);

  const result = await completeRes.json();
  updateProgress({ status: 'done', percentage: 100 });

  return result;
}
