import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-helpers';
import { toErrorResponse } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { PROJECT_ID } from '@/lib/constants';
import { getPresignedThumbnailPutUrl } from '@/lib/r2/client';

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const limited = rateLimit(req, 'thumbnail', 120, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: limited.retryAfterSeconds },
        { status: 429 }
      );
    }

    const thumbnailKey = `projects/${PROJECT_ID}/thumbnails/${crypto.randomUUID()}.jpg`;
    const uploadUrl = await getPresignedThumbnailPutUrl(thumbnailKey, 'image/jpeg', 900);

    return NextResponse.json({ thumbnailKey, uploadUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}
