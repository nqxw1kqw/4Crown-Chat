import { NextRequest, NextResponse } from 'next/server';
import { verifyProjectAccess } from '@/lib/auth-helpers';
import { abortMultipartUpload } from '@/lib/r2/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, uploadId, key } = body as {
      projectId: string;
      uploadId: string;
      key: string;
    };

    if (!projectId || !uploadId || !key) {
      return NextResponse.json({ error: 'Thiếu thông số bắt buộc' }, { status: 400 });
    }

    await verifyProjectAccess(projectId, ['OWNER', 'ADMIN', 'MEMBER']);

    await abortMultipartUpload(key, uploadId);

    const supabase = await createServerSupabaseClient();
    await supabase
      .from('uploads')
      .update({ status: 'aborted' })
      .eq('r2_upload_id', uploadId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
