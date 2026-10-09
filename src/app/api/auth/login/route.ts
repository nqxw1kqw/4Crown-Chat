import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHash } from 'crypto';
import { ApiError, toErrorResponse } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { listMembers } from '@/lib/data';
import { isSlotId } from '@/lib/constants';
import { serializeSession, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session';

function passcodeMatches(candidate: string, expected: string): boolean {
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'login', 12, 10 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: limited.retryAfterSeconds },
        { status: 429 }
      );
    }

    const passcode = process.env.TEAM_PASSCODE;
    if (!passcode) {
      throw new ApiError(500, 'system', 'TEAM_PASSCODE chưa được cấu hình');
    }

    const body = (await req.json().catch(() => null)) as { slot?: unknown; passcode?: unknown } | null;
    const slot = body?.slot;
    const supplied = body?.passcode;

    if (!isSlotId(slot) || typeof supplied !== 'string') {
      throw new ApiError(400, 'invalid');
    }

    if (!passcodeMatches(supplied, passcode)) {
      throw new ApiError(401, 'unauthorized');
    }

    const member = (await listMembers()).find((m) => m.slot === slot);
    if (!member) {
      throw new ApiError(403, 'forbidden');
    }

    const res = NextResponse.json({ slot: member.slot, userId: member.id, role: member.role });
    res.cookies.set(SESSION_COOKIE, serializeSession(member.slot, member.role), sessionCookieOptions);
    return res;
  } catch (err) {
    return toErrorResponse(err);
  }
}
