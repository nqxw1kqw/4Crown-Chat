import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyProjectAccess } from '@/lib/auth-helpers';
import { getPresignedFileDownloadUrl } from '@/lib/r2/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !file) {
      return NextResponse.json({ error: 'Không tìm thấy file' }, { status: 404 });
    }

    // Kiểm tra quyền (VIEWER trở lên)
    await verifyProjectAccess(file.project_id, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    // Cấp presigned Download URL
    const downloadUrl = await getPresignedFileDownloadUrl(file.file_key, file.name, 3600);

    return NextResponse.json({
      id: file.id,
      name: file.name,
      size: file.size,
      downloadUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
