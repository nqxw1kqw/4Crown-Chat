import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyProjectAccess } from '@/lib/auth-helpers';
import { getPresignedVideoGetUrl, getR2Client, getR2BucketName } from '@/lib/r2/client';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const keyParam = searchParams.get('key');
    const supabase = await createServerSupabaseClient();

    let fileKey: string | null = null;
    let thumbnailUrl: string | null = null;
    let videoTitle = 'Gameplay Video';
    let videoVersion = '1.0';
    let videoDuration = 0;
    let projectId = 'proj-1';

    try {
      const { data: video, error } = await supabase
        .from('gameplay_videos')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && video) {
        fileKey = video.file_key;
        videoTitle = video.title;
        videoVersion = video.version;
        videoDuration = video.duration;
        projectId = video.project_id;
        if (video.thumbnail_key) {
          thumbnailUrl = await getPresignedVideoGetUrl(video.thumbnail_key, 3600);
        }
      }
    } catch {
      // Bỏ qua lỗi DB ở chế độ demo
    }

    if (!fileKey && keyParam) {
      fileKey = keyParam;
    }

    if (!fileKey) {
      return NextResponse.json({ error: 'Không tìm thấy video' }, { status: 404 });
    }

    // Kiểm tra quyền (VIEWER trở lên)
    await verifyProjectAccess(projectId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    // Phân giải key thật trong Cloudflare R2 (hỗ trợ trường hợp key bị thiếu UUID từ client)
    let actualKey = fileKey;
    try {
      const s3 = getR2Client();
      const bucket = getR2BucketName();
      const filename = fileKey.split('/').pop() || fileKey;

      const listRes = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: `projects/${projectId}/video/`,
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
      console.warn('Lỗi phân giải key R2:', r2Err);
    }

    // Cấp presigned GET URL (1 giờ)
    const videoUrl = await getPresignedVideoGetUrl(actualKey, 3600);

    return NextResponse.json({
      id,
      title: videoTitle,
      version: videoVersion,
      duration: videoDuration,
      videoUrl,
      thumbnailUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
