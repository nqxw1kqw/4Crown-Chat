'use client';

import type { UploadKind } from '@/types/database';
import { UPLOAD_LIMITS } from '@/lib/constants';
import { apiFetch, apiPost, ApiClientError } from '@/lib/api-client';

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  currentPart: number;
  totalParts: number;
  speedBytesPerSec: number;
  remainingSeconds: number;
  status: 'idle' | 'initializing' | 'uploading' | 'completing' | 'done' | 'error' | 'aborted';
}

export interface VideoMetadataExtraction {
  duration: number;
  thumbnailBlob: Blob | null;
}

export type UploadValidationCode = 'sizeExceeded' | 'extNotSupported';

export interface UploadValidationResult {
  valid: boolean;
  code?: UploadValidationCode;
  params?: Record<string, string | number>;
}

export function isBrowserUnsupportedFormat(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.mov') || lower.endsWith('.mkv');
}

export function validateUploadFile(file: File, kind: UploadKind): UploadValidationResult {
  const limitConfig = UPLOAD_LIMITS[kind];
  if (!limitConfig) {
    return { valid: false, code: 'extNotSupported', params: { ext: '', allowed: '' } };
  }

  if (file.size > limitConfig.maxSize) {
    return {
      valid: false,
      code: 'sizeExceeded',
      params: {
        size: (file.size / (1024 * 1024 * 1024)).toFixed(2),
        max: Math.round(limitConfig.maxSize / (1024 * 1024 * 1024)),
        kind,
      },
    };
  }

  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!(limitConfig.allowedExtensions as readonly string[]).includes(extension)) {
    return {
      valid: false,
      code: 'extNotSupported',
      params: { ext: extension, allowed: limitConfig.allowedExtensions.join(', ') },
    };
  }

  return { valid: true };
}

/**
 * Trích xuất duration + thumbnail ngay trên trình duyệt.
 * Luôn resolve trong vòng 3.5s để không treo popup với định dạng không decode được.
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadataExtraction> {
  return new Promise((resolve) => {
    let settled = false;

    const timeoutTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ duration: 0, thumbnailBlob: null });
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
      resolve({ duration: 0, thumbnailBlob: null });
      return;
    }

    function cleanup() {
      clearTimeout(timeoutTimer);
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      }
    }

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      video.currentTime = Math.min(1, Math.max(0.1, duration * 0.1));
    };

    video.onseeked = () => {
      if (settled) return;
      settled = true;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || 640, 1280);
        const scale = canvas.width / (video.videoWidth || 640);
        canvas.height = (video.videoHeight || 360) * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve({ duration: video.duration || 0, thumbnailBlob: null });
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve({ duration: video.duration || 0, thumbnailBlob: blob });
          },
          'image/jpeg',
          0.85
        );
      } catch {
        cleanup();
        resolve({ duration: video.duration || 0, thumbnailBlob: null });
      }
    };

    video.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ duration: 0, thumbnailBlob: null });
    };
  });
}

interface InitResponse {
  uploadId: string;
  key: string;
  partSize: number;
  totalParts: number;
  partUrls: { partNumber: number; url: string }[];
}

interface CompleteResponse {
  success: boolean;
  kind: UploadKind;
  record: Record<string, unknown>;
}

export async function uploadLargeFileToR2({
  file,
  kind,
  extraMetadata = {},
  onProgress,
  signal,
  concurrency = 3,
}: {
  file: File;
  kind: UploadKind;
  extraMetadata?: Record<string, unknown>;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  concurrency?: number;
}): Promise<{ record: Record<string, unknown>; key: string }> {
  let uploadedBytes = 0;
  const startedAt = performance.now();

  const updateProgress = (state: Partial<UploadProgress>) => {
    if (!onProgress) return;
    const elapsedSec = (performance.now() - startedAt) / 1000;
    const speed = elapsedSec > 0.5 ? uploadedBytes / elapsedSec : 0;
    const remaining = Math.max(0, file.size - uploadedBytes);

    onProgress({
      uploadedBytes,
      totalBytes: file.size,
      percentage: file.size > 0 ? Math.min(100, Math.round((uploadedBytes / file.size) * 100)) : 0,
      currentPart: 0,
      totalParts: 1,
      speedBytesPerSec: speed,
      remainingSeconds: speed > 0 ? Math.ceil(remaining / speed) : 0,
      status: 'uploading',
      ...state,
    });
  };

  updateProgress({ status: 'initializing' });

  if (signal?.aborted) {
    updateProgress({ status: 'aborted' });
    throw new ApiClientError(0, 'system');
  }

  let thumbnailKey: string | null = null;
  let videoDuration = 0;

  if (kind === 'video') {
    const { duration, thumbnailBlob } = await extractVideoMetadata(file);
    videoDuration = duration;

    if (thumbnailBlob && !signal?.aborted) {
      try {
        const { thumbnailKey: key, uploadUrl } = await apiFetch<{
          thumbnailKey: string;
          uploadUrl: string;
        }>('/api/uploads/thumbnail-url', { method: 'POST', signal });

        await fetch(uploadUrl, {
          method: 'PUT',
          body: thumbnailBlob,
          headers: { 'Content-Type': 'image/jpeg' },
          signal,
        });
        thumbnailKey = key;
      } catch (thumbnailError) {
        // Thumbnail là phần phụ, upload chính vẫn phải chạy tiếp.
        console.warn('thumbnail upload failed:', thumbnailError);
      }
    }
  }

  if (signal?.aborted) {
    updateProgress({ status: 'aborted' });
    throw new ApiClientError(0, 'system');
  }

  const init = await apiPost<InitResponse>('/api/uploads/init', {
    filename: file.name,
    size: file.size,
    mime: file.type,
    kind,
  });

  const { uploadId, key: objectKey, partSize, totalParts } = init;
  const urlMap = new Map<number, string>(init.partUrls.map((item) => [item.partNumber, item.url]));

  const abortOnServer = () => {
    void apiPost('/api/uploads/abort', { uploadId }).catch(() => undefined);
  };
  signal?.addEventListener('abort', abortOnServer, { once: true });

  const completedParts: { PartNumber: number; ETag: string }[] = [];

  const getUrlForPart = async (partNumber: number): Promise<string> => {
    const cached = urlMap.get(partNumber);
    if (cached) return cached;

    const { url } = await apiPost<{ url: string }>('/api/uploads/part-url', { uploadId, partNumber });
    urlMap.set(partNumber, url);
    return url;
  };

  const uploadPart = async (partNumber: number) => {
    if (signal?.aborted) return;

    const start = (partNumber - 1) * partSize;
    const chunk = file.slice(start, Math.min(start + partSize, file.size));
    const chunkSize = chunk.size;
    const presignedUrl = await getUrlForPart(partNumber);

    if (signal?.aborted) return;

    const putRes = await fetch(presignedUrl, { method: 'PUT', body: chunk, signal });
    if (!putRes.ok) {
      throw new ApiClientError(putRes.status, 'system');
    }

    const etag = putRes.headers.get('ETag')?.replace(/"/g, '') ?? '';
    completedParts.push({ PartNumber: partNumber, ETag: `"${etag}"` });

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

  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, totalParts) }, async () => {
      while (cursor < totalParts && !signal?.aborted) {
        await uploadPart(cursor++ + 1);
      }
    })
  );

  if (signal?.aborted) {
    updateProgress({ status: 'aborted' });
    throw new ApiClientError(0, 'system');
  }

  updateProgress({ status: 'completing', percentage: 100 });

  const result = await apiPost<CompleteResponse>('/api/uploads/complete', {
    uploadId,
    parts: completedParts,
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
  });

  signal?.removeEventListener('abort', abortOnServer);
  updateProgress({ status: 'done', percentage: 100 });

  return { record: result.record, key: objectKey };
}
