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
    const supabase = await createServerSupabaseClient();

    const { data: video, error } = await supabase
      .from('gameplay_videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !video) {
      return NextResponse.json({ error: 'Không tìm thấy video' }, { status: 404 });
    }

    // Kiểm tra quyền (VIEWER trở lên)
    await verifyProjectAccess(video.project_id, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    // Cấp presigned GET URL (1 giờ)
    const videoUrl = await getPresignedVideoGetUrl(video.file_key, 3600);

    let thumbnailUrl: string | null = null;
    if (video.thumbnail_key) {
      thumbnailUrl = await getPresignedVideoGetUrl(video.thumbnail_key, 3600);
    }

    return NextResponse.json({
      id: video.id,
      title: video.title,
      version: video.version,
      duration: video.duration,
      videoUrl,
      thumbnailUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
