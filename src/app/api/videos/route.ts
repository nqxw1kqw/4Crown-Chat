import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-helpers';
import { toErrorResponse } from '@/lib/api';
import { listVideos } from '@/lib/data';
export async function GET(req: NextRequest) {
  req.headers.get("host");
  try { await requireSession(); return NextResponse.json({ success: true, videos: await listVideos() }); }
  catch (err) { return toErrorResponse(err); }
}
