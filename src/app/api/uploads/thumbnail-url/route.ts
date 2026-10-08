import { NextRequest, NextResponse } from 'next/server';
import { verifyProjectAccess } from '@/lib/auth-helpers';
import { getPresignedThumbnailPutUrl } from '@/lib/r2/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId } = body as { projectId: string };

    if (!projectId) {
      return NextResponse.json({ error: 'Thiếu projectId' }, { status: 400 });
    }

    await verifyProjectAccess(projectId, ['OWNER', 'ADMIN', 'MEMBER']);

    const thumbnailKey = `projects/${projectId}/thumbnails/${crypto.randomUUID()}.jpg`;
    const uploadUrl = await getPresignedThumbnailPutUrl(thumbnailKey, 'image/jpeg', 900);

    return NextResponse.json({
      thumbnailKey,
      uploadUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
