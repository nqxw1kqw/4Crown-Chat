import { NextRequest, NextResponse } from 'next/server';
import { dbError, toErrorResponse, ApiError } from '@/lib/api';
import { requireRecordManager, requireSession } from '@/lib/auth-helpers';
import { db, logActivity, resolveLinkedTask } from '@/lib/data';
import { PROJECT_ID } from '@/lib/constants';
import { deleteObject } from '@/lib/r2/client';
import type { FileRecord } from '@/types/database';

const FOLDERS = ['general', 'builds', 'assets', 'audio'] as const;

type RouteContext = { params: Promise<{ id: string }> };

async function requireFile(id: string): Promise<FileRecord> {
  const { data, error } = await db()
    .from('files')
    .select('*')
    .eq('id', id)
    .eq('project_id', PROJECT_ID)
    .maybeSingle();

  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, 'not_found');
  return data as FileRecord;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError(400, 'invalid');

    const existing = await requireFile(id);
    await requireRecordManager(existing.uploaded_by);
    const patch: Record<string, unknown> = {};

    if ('linked_task_id' in body) {
      patch.linked_task_id = await resolveLinkedTask(body.linked_task_id);
    }
    if ('folder' in body) {
      const folder = body.folder;
      if (!FOLDERS.includes(folder as (typeof FOLDERS)[number])) {
        throw new ApiError(400, 'invalid', 'folder');
      }
      patch.folder = folder;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ file: existing });
    }

    const { data: updated, error } = await db()
      .from('files')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw dbError(error);

    if ('linked_task_id' in patch) {
      const nextTaskId = patch.linked_task_id as string | null;
      if (nextTaskId && nextTaskId !== existing.linked_task_id) {
        await logActivity({
          taskId: nextTaskId,
          actorId: session.userId,
          action: 'attached',
          to: existing.name,
        });
      }
      if (existing.linked_task_id && existing.linked_task_id !== nextTaskId) {
        await logActivity({
          taskId: existing.linked_task_id,
          actorId: session.userId,
          action: 'detached',
          from: existing.name,
        });
      }
    }

    return NextResponse.json({ file: updated as FileRecord });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const existing = await requireFile(id);
    await requireRecordManager(existing.uploaded_by);

    const { error } = await db().from('files').delete().eq('id', id);
    if (error) throw dbError(error);

    try {
      await deleteObject(existing.file_key);
    } catch (r2Err) {
      console.error('[r2] delete failed for', existing.file_key, r2Err);
    }

    if (existing.linked_task_id) {
      await logActivity({
        taskId: existing.linked_task_id,
        actorId: session.userId,
        action: 'detached',
        from: existing.name,
      });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return toErrorResponse(err);
  }
}
