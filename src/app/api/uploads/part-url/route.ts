import { NextRequest, NextResponse } from 'next/server';
import { verifyProjectAccess } from '@/lib/auth-helpers';
import { getPresignedPartUrl } from '@/lib/r2/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, uploadId, key, partNumber } = body as {
      projectId: string;
      uploadId: string;
      key: string;
      partNumber: number;
    };

    if (!projectId || !uploadId || !key || !partNumber) {
      return NextResponse.json({ error: 'Thiếu thông số bắt buộc' }, { status: 400 });
    }

    // Kiểm tra quyền MEMBER trở lên
    await verifyProjectAccess(projectId, ['OWNER', 'ADMIN', 'MEMBER']);

    const url = await getPresignedPartUrl(key, uploadId, partNumber, 3600);

    return NextResponse.json({
      partNumber,
      url,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
