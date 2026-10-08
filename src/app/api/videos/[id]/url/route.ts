import { NextRequest, NextResponse } from 'next/server';
import { dbError, toErrorResponse, ApiError } from '@/lib/api';
import { requireSession } from '@/lib/auth-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { db } from '@/lib/data';
import { PROJECT_ID } from '@/lib/constants';
import { assertProjectKey, getPresignedVideoGetUrl } from '@/lib/r2/client';

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

    // Key chỉ được lấy từ row trong DB, không bao giờ từ query string.
    // Trước đây route này nhận ?key= tuỳ ý và ký URL cho mọi object trong bucket.
    const { data: video, error } = await db()
      .from('gameplay_videos')
      .select('*')
      .eq('id', id)
      .eq('project_id', PROJECT_ID)
      .maybeSingle();

    if (error) throw dbError(error);
    if (!video) throw new ApiError(404, 'not_found');

    const fileKey = assertProjectKey(video.file_key, PROJECT_ID);
    const videoUrl = await getPresignedVideoGetUrl(fileKey, SIGNED_URL_TTL_SECONDS);

    let thumbnailUrl: string | null = null;
    if (video.thumbnail_key) {
      try {
        thumbnailUrl = await getPresignedVideoGetUrl(
          assertProjectKey(video.thumbnail_key, PROJECT_ID),
          SIGNED_URL_TTL_SECONDS
        );
      } catch {
        thumbnailUrl = null;
      }
    }

    return NextResponse.json({
      id,
      title: video.title,
      version: video.version,
      duration: video.duration,
      videoUrl,
      thumbnailUrl,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
