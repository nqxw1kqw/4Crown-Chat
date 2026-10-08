import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyProjectAccess } from '@/lib/auth-helpers';
import { getPresignedFileDownloadUrl, getR2Client, getR2BucketName } from '@/lib/r2/client';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

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

    // Phân giải key thật trong Cloudflare R2 nếu key thiếu UUID
    let actualKey = fileKey;
    try {
      const s3 = getR2Client();
      const bucket = getR2BucketName();
      const filename = fileKey.split('/').pop() || fileKey;

      const listRes = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: `projects/${projectId}/`,
        })
      );

      if (listRes.Contents && listRes.Contents.length > 0) {
        const match = listRes.Contents.slice()
          .reverse()
          .find((item) => item.Key && (item.Key === fileKey || item.Key.endsWith(`/${filename}`)));
        if (match?.Key) {
          actualKey = match.Key;
        }
      }
    } catch (r2Err) {
      console.warn('Lỗi phân giải file key R2:', r2Err);
    }

    // Cấp presigned Download URL
    const downloadUrl = await getPresignedFileDownloadUrl(actualKey, fileName, 3600);

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
