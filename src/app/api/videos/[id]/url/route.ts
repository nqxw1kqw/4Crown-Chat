import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyProjectAccess } from '@/lib/auth-helpers';
import { getPresignedVideoGetUrl } from '@/lib/r2/client';

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

    // Cấp presigned GET URL (1 giờ)
    const videoUrl = await getPresignedVideoGetUrl(fileKey, 3600);

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
