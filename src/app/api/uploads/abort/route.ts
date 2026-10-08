import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-helpers';
import { toErrorResponse } from '@/lib/api';
import { markUploadStatus, requireOwnedUpload } from '@/lib/data';
import { abortMultipartUpload } from '@/lib/r2/client';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await req.json().catch(() => null)) as { uploadId?: unknown } | null;

    const upload = await requireOwnedUpload(body?.uploadId, session.userId);
    await abortMultipartUpload(upload.key, upload.r2_upload_id);
    await markUploadStatus(upload.r2_upload_id, 'aborted');

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
