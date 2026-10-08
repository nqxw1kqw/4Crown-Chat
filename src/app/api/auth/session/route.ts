import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api';
import { requireSession } from '@/lib/auth-helpers';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'session', 300, 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: limited.retryAfterSeconds },
        { status: 429 }
      );
    }

    const session = await requireSession();
    return NextResponse.json({
      slot: session.slot,
      userId: session.userId,
      role: session.role,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
