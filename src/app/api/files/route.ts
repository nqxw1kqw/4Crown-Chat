import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listR2Objects, deleteR2Object, getPresignedVideoGetUrl } from '@/lib/r2/client';
import { DEFAULT_PROJECT_ID, toProjectUuid } from '@/lib/constants';
import { FileRecord } from '@/types/database';

function isImageKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.bmp')
  );
}

function isNonMediaFileKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.includes('/thumbnails/')) return false;
  if (lower.includes('/video/')) return false;
  if (
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.mkv') ||
    lower.endsWith('.webm')
  ) {
    return false;
  }
  return true;
}

function extractFileName(key: string): string {
  const parts = key.split('/');
  const filename = parts[parts.length - 1] || 'file';
  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
}

function detectFolderFromKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes('/builds/') || lower.endsWith('.zip') || lower.endsWith('.apk') || lower.endsWith('.exe')) {
    return 'builds';
  }
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.psd') ||
    lower.endsWith('.blend') ||
    lower.endsWith('.fbx')
  ) {
    return 'art';
  }
  if (lower.endsWith('.wav') || lower.endsWith('.mp3') || lower.endsWith('.ogg')) {
    return 'audio';
  }
  if (lower.endsWith('.pdf') || lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.doc')) {
    return 'gdd';
  }
  return 'general';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || DEFAULT_PROJECT_ID;
    const projectUuid = toProjectUuid(projectId);

    const supabase = await createServerSupabaseClient();

    // 1. Lấy danh sách file từ Supabase
    let dbFiles: FileRecord[] = [];
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        dbFiles = data as FileRecord[];
      }
    } catch (dbErr) {
      console.warn('Lỗi query Supabase files:', dbErr);
    }

    // 2. Lấy toàn bộ objects từ Cloudflare R2
    let r2Objects: Awaited<ReturnType<typeof listR2Objects>> = [];
    try {
      r2Objects = await listR2Objects();
    } catch (r2Err) {
      console.warn('Lỗi list objects từ Cloudflare R2:', r2Err);
    }

    // 3. Phân tách danh sách file từ R2 (loại trừ video & thumbnail)
    const r2FileObjects = r2Objects.filter((obj) => obj.Key && isNonMediaFileKey(obj.Key));

    const existingFileKeys = new Set(dbFiles.map((f) => f.file_key));
    const newlySyncedFiles: FileRecord[] = [];

    for (const obj of r2FileObjects) {
      if (!obj.Key || existingFileKeys.has(obj.Key)) continue;

      const fileName = extractFileName(obj.Key);
      const folder = detectFolderFromKey(obj.Key);
      const createdAt = obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString();

      const newRecord: FileRecord = {
        id: `file-${crypto.randomUUID()}`,
        project_id: projectId,
        folder,
        name: fileName,
        file_key: obj.Key,
        size: obj.Size || 0,
        mime: 'application/octet-stream',
        uploaded_by: 'm1',
        linked_task_id: null,
        created_at: createdAt,
      };

      newlySyncedFiles.push(newRecord);

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

        await supabase.from('files').insert({
          project_id: projectUuid,
          folder,
          name: fileName,
          file_key: obj.Key,
          size: obj.Size || 0,
          mime: 'application/octet-stream',
          uploaded_by: null,
          linked_task_id: null,
        });
      } catch (insertErr) {
        console.warn('Lỗi auto-sync file vào DB:', insertErr);
      }
    }

    const merged = [...dbFiles, ...newlySyncedFiles];
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const filesWithPreviews: FileRecord[] = await Promise.all(
      merged.map(async (file) => {
        if (isImageKey(file.file_key || file.name)) {
          try {
            const previewUrl = await getPresignedVideoGetUrl(file.file_key, 86400);
            return { ...file, preview_url: previewUrl };
          } catch (previewErr) {
            console.warn('Lỗi tạo preview URL cho file ảnh:', file.file_key, previewErr);
            return file;
          }
        }
        return file;
      })
    );

    return NextResponse.json({
      success: true,
      files: filesWithPreviews,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi nạp danh sách file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const key = searchParams.get('key');

    const supabase = await createServerSupabaseClient();

    let actualKey = key;

    // 1. Xóa trong database nếu có id (lấy file_key trước khi xóa)
    if (id) {
      try {
        const { data } = await supabase.from('files').select('file_key').eq('id', id).single();
        if (data?.file_key) {
          actualKey = data.file_key;
        }
        await supabase.from('files').delete().eq('id', id);
      } catch (err) {
        console.warn('Lỗi xóa file trong DB:', err);
      }
    }

    // 2. Xóa file trên Cloudflare R2
    if (actualKey) {
      try {
        await deleteR2Object(actualKey);
      } catch (r2Err) {
        console.warn('Lỗi xóa file trên R2:', r2Err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi xóa file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
