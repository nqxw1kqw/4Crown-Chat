import { NextRequest, NextResponse } from 'next/server';
import { verifyProjectAccess } from '@/lib/auth-helpers';
import { createMultipartUpload, getPresignedPartUrl } from '@/lib/r2/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { UPLOAD_LIMITS, DEFAULT_PART_SIZE, MIN_PART_SIZE } from '@/lib/constants';
import { UploadKind } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, filename, size, mime, kind } = body as {
      projectId: string;
      filename: string;
      size: number;
      mime?: string;
      kind: UploadKind;
    };

    if (!projectId || !filename || !size || !kind) {
      return NextResponse.json({ error: 'Thiếu thông số bắt buộc' }, { status: 400 });
    }

    // 1. Kiểm tra quyền (phải từ MEMBER trở lên)
    const { user } = await verifyProjectAccess(projectId, ['OWNER', 'ADMIN', 'MEMBER']);

    // 2. Kiểm tra loại upload hợp lệ
    const limitConfig = UPLOAD_LIMITS[kind];
    if (!limitConfig) {
      return NextResponse.json({ error: 'Loại file không hợp lệ' }, { status: 400 });
    }

    // 3. Kiểm tra kích thước
    if (size > limitConfig.maxSize) {
      return NextResponse.json(
        { error: `File vượt quá dung lượng cho phép (${Math.round(limitConfig.maxSize / (1024 * 1024 * 1024))}GB)` },
        { status: 400 }
      );
    }

    // 4. Kiểm tra phần mở rộng file
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    const isAllowedExt = (limitConfig.allowedExtensions as readonly string[]).includes(ext);
    if (!isAllowedExt) {
      return NextResponse.json(
        { error: `Phần mở rộng ${ext} không được hỗ trợ cho loại ${kind}` },
        { status: 400 }
      );
    }

    // 5. Chuẩn hóa object key trên R2: projects/{projectId}/{kind}/{uuid}/{filename}
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `projects/${projectId}/${kind}/${crypto.randomUUID()}/${cleanFilename}`;

    // 6. Gọi R2 CreateMultipartUpload
    const uploadId = await createMultipartUpload(objectKey, mime || 'application/octet-stream');

    // 7. Ghi bản ghi vào bảng uploads (status: pending)
    const supabase = await createServerSupabaseClient();
    const { error: insertError } = await supabase.from('uploads').insert({
      project_id: projectId,
      user_id: user.id,
      kind,
      key: objectKey,
      r2_upload_id: uploadId,
      status: 'pending',
      size,
    });

    if (insertError) {
      console.error('Lỗi lưu upload record vào database:', insertError);
    }

    // 8. Tính toán số part
    // Quy tắc: part_size tối thiểu 5MB, mặc định 100MB cho file lớn
    let partSize = DEFAULT_PART_SIZE;
    if (size < DEFAULT_PART_SIZE) {
      partSize = Math.max(size, MIN_PART_SIZE);
    }

    const totalParts = Math.ceil(size / partSize);

    // 9. Cấp presigned URLs trước cho các part (hoặc toàn bộ nếu < 100 parts)
    const partsToPresign = Math.min(totalParts, 20); // Tạo trước 20 part đầu, client có thể lấy thêm qua /part-url
    const partUrls: { partNumber: number; url: string }[] = [];

    for (let i = 1; i <= partsToPresign; i++) {
      const url = await getPresignedPartUrl(objectKey, uploadId, i, 3600);
      partUrls.push({ partNumber: i, url });
    }

    return NextResponse.json({
      uploadId,
      key: objectKey,
      partSize,
      totalParts,
      partUrls,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
