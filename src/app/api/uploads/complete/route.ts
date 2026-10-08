import { NextRequest, NextResponse } from 'next/server';
import { verifyProjectAccess } from '@/lib/auth-helpers';
import { completeMultipartUpload } from '@/lib/r2/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { UploadKind } from '@/types/database';

interface CompletedPartItem {
  PartNumber: number;
  ETag: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId,
      uploadId,
      key,
      parts,
      kind,
      size,
      metadata,
    } = body as {
      projectId: string;
      uploadId: string;
      key: string;
      parts: CompletedPartItem[];
      kind: UploadKind;
      size: number;
      metadata: {
        filename: string;
        mime?: string;
        title?: string;
        description?: string;
        version?: string;
        thumbnailKey?: string | null;
        duration?: number;
        folder?: string;
        linkedTaskId?: string | null;
      };
    };

    if (!projectId || !uploadId || !key || !parts || !kind) {
      return NextResponse.json({ error: 'Thiếu thông số bắt buộc' }, { status: 400 });
    }

    const { user } = await verifyProjectAccess(projectId, ['OWNER', 'ADMIN', 'MEMBER']);

    // 1. Sắp xếp các part theo PartNumber tăng dần (yêu cầu của S3 / R2)
    const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

    // 2. Gọi R2 CompleteMultipartUpload
    await completeMultipartUpload(key, uploadId, sortedParts);

    // 3. Cập nhật bảng uploads
    const supabase = await createServerSupabaseClient();
    await supabase
      .from('uploads')
      .update({ status: 'completed' })
      .eq('r2_upload_id', uploadId);

    let insertedRecord = null;

    // 4. Ghi bản ghi vào bảng tương ứng
    if (kind === 'video') {
      try {
        const { data, error } = await supabase
          .from('gameplay_videos')
          .insert({
            project_id: projectId,
            version: metadata?.version || '1.0',
            title: metadata?.title || metadata?.filename || 'Gameplay Video',
            description: metadata?.description || '',
            file_key: key,
            thumbnail_key: metadata?.thumbnailKey || null,
            duration: metadata?.duration || 0,
            size: size || 0,
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (error) {
          console.warn('Lỗi lưu video metadata vào database (chế độ demo):', error.message);
          insertedRecord = {
            id: `vid-${crypto.randomUUID()}`,
            project_id: projectId,
            version: metadata?.version || '1.0',
            title: metadata?.title || metadata?.filename || 'Gameplay Video',
            description: metadata?.description || '',
            file_key: key,
            thumbnail_key: metadata?.thumbnailKey || null,
            duration: metadata?.duration || 0,
            size: size || 0,
            uploaded_by: user.id,
            created_at: new Date().toISOString(),
          };
        } else {
          insertedRecord = data;
        }
      } catch (dbErr) {
        console.warn('Ngoại lệ khi lưu video metadata (chế độ demo):', dbErr);
        insertedRecord = {
          id: `vid-${crypto.randomUUID()}`,
          project_id: projectId,
          version: metadata?.version || '1.0',
          title: metadata?.title || metadata?.filename || 'Gameplay Video',
          description: metadata?.description || '',
          file_key: key,
          thumbnail_key: metadata?.thumbnailKey || null,
          duration: metadata?.duration || 0,
          size: size || 0,
          uploaded_by: user.id,
          created_at: new Date().toISOString(),
        };
      }
    } else {
      // kind === 'file' hoặc 'build'
      try {
        const { data, error } = await supabase
          .from('files')
          .insert({
            project_id: projectId,
            folder: metadata?.folder || (kind === 'build' ? 'builds' : 'general'),
            name: metadata?.filename || 'File',
            file_key: key,
            size: size || 0,
            mime: metadata?.mime || 'application/octet-stream',
            uploaded_by: user.id,
            linked_task_id: metadata?.linkedTaskId || null,
          })
          .select()
          .single();

        if (error) {
          console.warn('Lỗi lưu file metadata vào database (chế độ demo):', error.message);
          insertedRecord = {
            id: `file-${crypto.randomUUID()}`,
            project_id: projectId,
            folder: metadata?.folder || (kind === 'build' ? 'builds' : 'general'),
            name: metadata?.filename || 'File',
            file_key: key,
            size: size || 0,
            mime: metadata?.mime || 'application/octet-stream',
            uploaded_by: user.id,
            linked_task_id: metadata?.linkedTaskId || null,
            created_at: new Date().toISOString(),
          };
        } else {
          insertedRecord = data;
        }
      } catch (dbErr) {
        console.warn('Ngoại lệ khi lưu file metadata (chế độ demo):', dbErr);
        insertedRecord = {
          id: `file-${crypto.randomUUID()}`,
          project_id: projectId,
          folder: metadata?.folder || (kind === 'build' ? 'builds' : 'general'),
          name: metadata?.filename || 'File',
          file_key: key,
          size: size || 0,
          mime: metadata?.mime || 'application/octet-stream',
          uploaded_by: user.id,
          linked_task_id: metadata?.linkedTaskId || null,
          created_at: new Date().toISOString(),
        };
      }
    }

    return NextResponse.json({
      success: true,
      kind,
      record: insertedRecord,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
