import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-helpers';
import { dbError, ApiError, toErrorResponse } from '@/lib/api';
import { db, logActivity, markUploadStatus, requireOwnedUpload, requireTaskInProject } from '@/lib/data';
import { PROJECT_ID } from '@/lib/constants';
import { completeMultipartUpload } from '@/lib/r2/client';
import type { CompletedPart } from '@aws-sdk/client-s3';

const FOLDERS = ['general', 'builds', 'assets', 'audio'] as const;
const MAX_PARTS = 10_000;

interface RawPart {
  PartNumber?: unknown;
  ETag?: unknown;
}

function parseParts(value: unknown): CompletedPart[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PARTS) {
    throw new ApiError(400, 'invalid', 'parts');
  }

  const seen = new Set<number>();
  const parts = (value as RawPart[]).map((part) => {
    const partNumber = part?.PartNumber;
    const etag = part?.ETag;
    if (typeof partNumber !== 'number' || !Number.isInteger(partNumber) || partNumber < 1) {
      throw new ApiError(400, 'invalid', 'parts.PartNumber');
    }
    if (typeof etag !== 'string' || !etag || etag.length > 128) {
      throw new ApiError(400, 'invalid', 'parts.ETag');
    }
    if (seen.has(partNumber)) throw new ApiError(400, 'invalid', 'duplicate part number');
    seen.add(partNumber);
    return { PartNumber: partNumber, ETag: etag };
  });

  return parts.sort((a, b) => a.PartNumber! - b.PartNumber!);
}

function text(value: unknown, fallback: string, max: number): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    const body = (await req.json().catch(() => null)) as {
      uploadId?: unknown;
      parts?: unknown;
      metadata?: Record<string, unknown>;
    } | null;

    const upload = await requireOwnedUpload(body?.uploadId, session.userId);
    const parts = parseParts(body?.parts);
    const metadata = body?.metadata ?? {};

    await completeMultipartUpload(upload.key, upload.r2_upload_id, parts);
    await markUploadStatus(upload.r2_upload_id, 'completed');

    let linkedTaskId: string | null = null;
    if (typeof metadata.linkedTaskId === 'string' && metadata.linkedTaskId) {
      const task = await requireTaskInProject(metadata.linkedTaskId);
      linkedTaskId = task.id;
    }

    const client = db();
    let record: unknown;

    if (upload.kind === 'video') {
      const thumbnailPrefix = `projects/${PROJECT_ID}/thumbnails/`;
      const thumbnailKey =
        typeof metadata.thumbnailKey === 'string' && metadata.thumbnailKey.startsWith(thumbnailPrefix)
          ? metadata.thumbnailKey
          : null;

      const duration =
        typeof metadata.duration === 'number' && Number.isFinite(metadata.duration) && metadata.duration >= 0
          ? Math.min(metadata.duration, 24 * 3600)
          : 0;

      const { data, error } = await client
        .from('gameplay_videos')
        .insert({
          project_id: PROJECT_ID,
          version: text(metadata.version, '1.0', 40),
          title: text(metadata.title, upload.key.split('/').pop() ?? 'Gameplay Video', 200),
          description: text(metadata.description, '', 10_000),
          file_key: upload.key,
          thumbnail_key: thumbnailKey,
          duration,
          size: upload.size,
          uploaded_by: session.userId,
          linked_task_id: linkedTaskId,
        })
        .select('*')
        .single();

      if (error) throw dbError(error);
      record = data;
    } else {
      const folder = FOLDERS.includes(metadata.folder as (typeof FOLDERS)[number])
        ? (metadata.folder as (typeof FOLDERS)[number])
        : upload.kind === 'build'
          ? 'builds'
          : 'general';

      const { data, error } = await client
        .from('files')
        .insert({
          project_id: PROJECT_ID,
          folder,
          name: text(metadata.filename, upload.key.split('/').pop() ?? 'File', 300),
          file_key: upload.key,
          size: upload.size,
          mime: text(metadata.mime, 'application/octet-stream', 200),
          uploaded_by: session.userId,
          linked_task_id: linkedTaskId,
        })
        .select('*')
        .single();

      if (error) throw dbError(error);
      record = data;
    }

    if (linkedTaskId) {
      await logActivity({ taskId: linkedTaskId, actorId: session.userId, action: 'attached', to: upload.key });
    }

    return NextResponse.json({ success: true, kind: upload.kind, record });
  } catch (err) {
    return toErrorResponse(err);
  }
}
