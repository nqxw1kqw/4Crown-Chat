import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-helpers';
import { toErrorResponse } from '@/lib/api';
import { listFiles } from '@/lib/data';
export async function GET(req: NextRequest) {
  req.headers.get("host");
  try { await requireSession(); return NextResponse.json({ success: true, files: await listFiles() }); }
  catch (err) { return toErrorResponse(err); }
}
