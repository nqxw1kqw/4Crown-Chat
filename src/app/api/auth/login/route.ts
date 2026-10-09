import { NextRequest, NextResponse } from 'next/server';
import { ApiError, toErrorResponse } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { listMembers } from '@/lib/data';
import { isSlotId } from '@/lib/constants';
import { serializeSession, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'login', 60, 10 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: limited.retryAfterSeconds },
        { status: 429 }
      );
    }

    const body = (await req.json().catch(() => null)) as { slot?: unknown } | null;
    const slot = body?.slot;

    if (!isSlotId(slot)) {
      throw new ApiError(400, 'invalid', 'Slot nhân vật không hợp lệ');
    }

    const member = (await listMembers()).find((m) => m.slot === slot);
    if (!member) {
      throw new ApiError(403, 'forbidden', 'Không tìm thấy thông tin thành viên');
    }

    const res = NextResponse.json({ slot: member.slot, userId: member.id, role: member.role });
    res.cookies.set(SESSION_COOKIE, serializeSession(member.slot, member.role), sessionCookieOptions);
    return res;
  } catch (err) {
    return toErrorResponse(err);
  }
}
