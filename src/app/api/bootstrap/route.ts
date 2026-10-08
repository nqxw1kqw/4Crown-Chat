import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api';
import { requireSession } from '@/lib/auth-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { getBootstrap } from '@/lib/data';

export async function GET(req: NextRequest) {
  try {
    // Chạm request.headers trước để Next bail-out khỏi prerender một cách sạch sẽ,
    // tránh việc cookies() bị reject sau khi prerender đã kết thúc.
    const limited = rateLimit(req, 'bootstrap', 300, 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: limited.retryAfterSeconds },
        { status: 429 }
      );
    }

    await requireSession();
    return NextResponse.json(await getBootstrap());
  } catch (err) {
    return toErrorResponse(err);
  }
}
