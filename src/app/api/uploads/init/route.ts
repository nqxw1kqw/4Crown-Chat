import { NextRequest, NextResponse } from 'next/server';
import { requireContributor } from '@/lib/auth-helpers';
import { dbError, ApiError, toErrorResponse } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { createMultipartUpload, getPresignedPartUrl } from '@/lib/r2/client';
import { db } from '@/lib/data';
import { PROJECT_ID, UPLOAD_LIMITS, DEFAULT_PART_SIZE, MIN_PART_SIZE } from '@/lib/constants';
import type { UploadKind } from '@/types/database';

const KINDS: readonly UploadKind[] = ['video', 'build', 'file'];
const PRESIGNED_PARTS_UPFRONT = 20;

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireContributor();

    const limited = rateLimit(req, 'upload-init', 60, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: limited.retryAfterSeconds },
        { status: 429 }
      );
    }

    const body = (await req.json().catch(() => null)) as {
      filename?: unknown;
      size?: unknown;
      mime?: unknown;
      kind?: unknown;
    } | null;

    const kind = body?.kind;
    const filename = body?.filename;
    const size = body?.size;

    if (typeof kind !== 'string' || !KINDS.includes(kind as UploadKind)) {
      throw new ApiError(400, 'invalid', 'kind');
    }
    if (typeof filename !== 'string' || !filename.trim()) {
      throw new ApiError(400, 'invalid', 'filename');
    }
    if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
      throw new ApiError(400, 'invalid', 'size');
    }

    const limitConfig = UPLOAD_LIMITS[kind as UploadKind];
    if (size > limitConfig.maxSize) {
      throw new ApiError(400, 'invalid', 'size');
    }

    const dot = filename.lastIndexOf('.');
    const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : '';
    if (!(limitConfig.allowedExtensions as readonly string[]).includes(ext)) {
      throw new ApiError(400, 'invalid', 'filename');
    }

    // projectId do server quyết định, không nhận từ client.
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180) || `file${ext}`;
    const objectKey = `projects/${PROJECT_ID}/${kind}/${crypto.randomUUID()}/${cleanFilename}`;
    const contentType =
      typeof body?.mime === 'string' && /^[\w!#$&^_.+-]{1,127}\/[\w!#$&^_.+-]{1,127}$/.test(body.mime)
        ? body.mime
        : 'application/octet-stream';

    const uploadId = await createMultipartUpload(objectKey, contentType);

    const { error: insertError } = await db().from('uploads').insert({
      project_id: PROJECT_ID,
      user_id: session.userId,
      kind,
      key: objectKey,
      r2_upload_id: uploadId,
      status: 'pending',
      size,
    });
    if (insertError) throw dbError(insertError);

    const partSize = size < DEFAULT_PART_SIZE ? Math.max(size, MIN_PART_SIZE) : DEFAULT_PART_SIZE;
    const totalParts = Math.max(1, Math.ceil(size / partSize));

    const partUrls: { partNumber: number; url: string }[] = [];
    for (let partNumber = 1; partNumber <= Math.min(totalParts, PRESIGNED_PARTS_UPFRONT); partNumber++) {
      partUrls.push({
        partNumber,
        url: await getPresignedPartUrl(objectKey, uploadId, partNumber, 3600),
      });
    }

    return NextResponse.json({ uploadId, key: objectKey, partSize, totalParts, partUrls });
  } catch (err) {
    return toErrorResponse(err);
  }
}
