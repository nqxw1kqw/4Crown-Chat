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
    const { searchParams } = new URL(req.url);
    const keyParam = searchParams.get('key');
    const nameParam = searchParams.get('name');
    const supabase = await createServerSupabaseClient();

    let fileKey: string | null = null;
    let fileName = 'download';
    let fileSize = 0;
    let projectId = 'proj-1';

    try {
      const { data: file, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && file) {
        fileKey = file.file_key;
        fileName = file.name;
        fileSize = file.size;
        projectId = file.project_id;
      }
    } catch {
      // Bỏ qua lỗi DB ở chế độ demo
    }

    if (!fileKey && keyParam) {
      fileKey = keyParam;
      fileName = nameParam || 'file';
    }

    if (!fileKey) {
      return NextResponse.json({ error: 'Không tìm thấy file' }, { status: 404 });
    }

    // Kiểm tra quyền (VIEWER trở lên)
    await verifyProjectAccess(projectId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    // Cấp presigned Download URL
    const downloadUrl = await getPresignedFileDownloadUrl(fileKey, fileName, 3600);

    return NextResponse.json({
      id,
      name: fileName,
      size: fileSize,
      downloadUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
