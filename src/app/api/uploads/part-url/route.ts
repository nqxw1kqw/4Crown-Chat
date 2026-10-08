import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-helpers';
import { ApiError, toErrorResponse } from '@/lib/api';
import { requireOwnedUpload } from '@/lib/data';
import { getPresignedPartUrl } from '@/lib/r2/client';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    const body = (await req.json().catch(() => null)) as {
      uploadId?: unknown;
      partNumber?: unknown;
    } | null;

    const partNumber = body?.partNumber;
    if (typeof partNumber !== 'number' || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000) {
      throw new ApiError(400, 'invalid', 'partNumber');
    }

    const upload = await requireOwnedUpload(body?.uploadId, session.userId);
    const url = await getPresignedPartUrl(upload.key, upload.r2_upload_id, partNumber, 3600);

    return NextResponse.json({ partNumber, url });
  } catch (err) {
    return toErrorResponse(err);
  }
}
