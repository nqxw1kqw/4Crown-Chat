import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  listR2Objects,
  deleteR2Object,
  getPresignedVideoGetUrl,
} from '@/lib/r2/client';
import { DEFAULT_PROJECT_ID, toProjectUuid } from '@/lib/constants';
import { GameplayVideo } from '@/types/database';

function isVideoKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes('/video/') ||
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.mkv')
  );
}

function extractTitleFromKey(key: string): string {
  const parts = key.split('/');
  const filename = parts[parts.length - 1] || 'gameplay-video';
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  try {
    return decodeURIComponent(nameWithoutExt).replace(/_/g, ' ');
  } catch {
    return nameWithoutExt.replace(/_/g, ' ');
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || DEFAULT_PROJECT_ID;
    const projectUuid = toProjectUuid(projectId);

    const supabase = await createServerSupabaseClient();

    // 1. Lấy danh sách video từ Supabase
    let dbVideos: GameplayVideo[] = [];
    try {
      const { data, error } = await supabase
        .from('gameplay_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        dbVideos = data as GameplayVideo[];
      }
    } catch (dbErr) {
      console.warn('Lỗi query Supabase gameplay_videos:', dbErr);
    }

    // 2. Lấy toàn bộ objects từ Cloudflare R2
    let r2Objects: Awaited<ReturnType<typeof listR2Objects>> = [];
    try {
      r2Objects = await listR2Objects();
    } catch (r2Err) {
      console.warn('Lỗi list objects từ Cloudflare R2:', r2Err);
    }

    // 3. Phân tách danh sách video và thumbnails từ R2
    const r2VideoObjects = r2Objects.filter((obj) => obj.Key && isVideoKey(obj.Key));
    const r2Thumbnails = r2Objects.filter(
      (obj) => obj.Key && (obj.Key.includes('/thumbnails/') || obj.Key.endsWith('.jpg') || obj.Key.endsWith('.png'))
    );

    const existingFileKeys = new Set(dbVideos.map((v) => v.file_key));
    const newlySyncedVideos: GameplayVideo[] = [];

    // 4. Nếu có video trên R2 mà DB chưa có, tự động tạo và ghi nhận
    for (let index = 0; index < r2VideoObjects.length; index++) {
      const obj = r2VideoObjects[index];
      if (!obj.Key || existingFileKeys.has(obj.Key)) continue;

      // Tìm thumbnail tương ứng nếu có
      let matchedThumbKey: string | null = null;
      if (r2Thumbnails.length > 0) {
        // Ưu tiên thumbnail cùng chỉ số hoặc cùng tên nếu có
        matchedThumbKey = r2Thumbnails[index % r2Thumbnails.length].Key || null;
      }

      const cleanTitle = extractTitleFromKey(obj.Key);
      const createdAt = obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString();

      const newRecord: GameplayVideo = {
        id: `vid-${crypto.randomUUID()}`,
        project_id: projectId,
        version: '1.0',
        title: cleanTitle,
        description: 'Đồng bộ từ Cloudflare R2',
        file_key: obj.Key,
        thumbnail_key: matchedThumbKey,
        duration: 0,
        size: obj.Size || 0,
        uploaded_by: 'm1',
        created_at: createdAt,
      };

      newlySyncedVideos.push(newRecord);

      // Thử đồng bộ vào Supabase nếu có thể
      try {
        await supabase.from('projects').upsert(
          {
            id: projectUuid,
            name: 'Game Team Project',
            status: 'active',
          },
          { onConflict: 'id' }
        );

        await supabase.from('gameplay_videos').insert({
          project_id: projectUuid,
          version: '1.0',
          title: cleanTitle,
          description: 'Đồng bộ từ Cloudflare R2',
          file_key: obj.Key,
          thumbnail_key: matchedThumbKey,
          duration: 0,
          size: obj.Size || 0,
          uploaded_by: null,
        });
      } catch (insertErr) {
        console.warn('Lỗi auto-sync video vào DB:', insertErr);
      }
    }

    const merged = [...dbVideos, ...newlySyncedVideos];

    // 5. Cấp presigned URL cho các thumbnail nằm trên R2 để hiển thị trực tiếp ảnh
    const resolvedVideos: GameplayVideo[] = await Promise.all(
      merged.map(async (v) => {
        if (v.thumbnail_key && !v.thumbnail_key.startsWith('http') && !v.thumbnail_key.startsWith('data:')) {
          try {
            const signedThumb = await getPresignedVideoGetUrl(v.thumbnail_key, 86400);
            return { ...v, thumbnail_key: signedThumb };
          } catch {
            return v;
          }
        }
        return v;
      })
    );

    // Sắp xếp video mới nhất lên đầu
    resolvedVideos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      videos: resolvedVideos,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi nạp danh sách video';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const key = searchParams.get('key');
    const thumbnailKey = searchParams.get('thumbnailKey');

    const supabase = await createServerSupabaseClient();

    // 1. Xóa trong database nếu có id
    if (id) {
      try {
        await supabase.from('gameplay_videos').delete().eq('id', id);
      } catch (err) {
        console.warn('Lỗi xóa video trong DB:', err);
      }
    }

    // 2. Xóa file trên Cloudflare R2
    if (key) {
      try {
        await deleteR2Object(key);
      } catch (r2Err) {
        console.warn('Lỗi xóa video trên R2:', r2Err);
      }
    }

    // 3. Xóa thumbnail trên R2 nếu có
    if (thumbnailKey && !thumbnailKey.startsWith('http') && !thumbnailKey.startsWith('data:')) {
      try {
        await deleteR2Object(thumbnailKey);
      } catch (thumbErr) {
        console.warn('Lỗi xóa thumbnail trên R2:', thumbErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi xóa video';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
