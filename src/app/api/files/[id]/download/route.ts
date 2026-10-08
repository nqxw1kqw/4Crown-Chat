import { NextRequest, NextResponse } from 'next/server';
import { dbError, toErrorResponse, ApiError } from '@/lib/api';
import { requireSession } from '@/lib/auth-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { db } from '@/lib/data';
import { PROJECT_ID } from '@/lib/constants';
import { assertProjectKey, getPresignedFileDownloadUrl } from '@/lib/r2/client';

const SIGNED_URL_TTL_SECONDS = 3600;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();

    const limited = rateLimit(req, 'signed-url', 240, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: limited.retryAfterSeconds },
        { status: 429 }
      );
    }

    const { id } = await params;

    // Key và tên file chỉ được lấy từ row trong DB, không bao giờ từ query string.
    const { data: file, error } = await db()
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('project_id', PROJECT_ID)
      .maybeSingle();

    if (error) throw dbError(error);
    if (!file) throw new ApiError(404, 'not_found');

    const fileKey = assertProjectKey(file.file_key, PROJECT_ID);
    const downloadUrl = await getPresignedFileDownloadUrl(fileKey, file.name, SIGNED_URL_TTL_SECONDS);

    return NextResponse.json({
      id,
      name: file.name,
      size: file.size,
      downloadUrl,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
