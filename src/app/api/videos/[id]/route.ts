import { NextRequest, NextResponse } from 'next/server';
import { dbError, toErrorResponse, ApiError } from '@/lib/api';
import { requireRecordManager, requireSession } from '@/lib/auth-helpers';
import { db, logActivity, resolveLinkedTask } from '@/lib/data';
import { PROJECT_ID } from '@/lib/constants';
import { deleteObject } from '@/lib/r2/client';
import type { GameplayVideo } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

async function requireVideo(id: string): Promise<GameplayVideo> {
  const { data, error } = await db()
    .from('gameplay_videos')
    .select('*')
    .eq('id', id)
    .eq('project_id', PROJECT_ID)
    .maybeSingle();

  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, 'not_found');
  return data as GameplayVideo;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError(400, 'invalid');

    const existing = await requireVideo(id);
    await requireRecordManager(existing.uploaded_by);
    const patch: Record<string, unknown> = {};

    if ('linked_task_id' in body) {
      patch.linked_task_id = await resolveLinkedTask(body.linked_task_id);
    }
    for (const field of ['title', 'version'] as const) {
      if (!(field in body)) continue;
      const value = body[field];
      if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
        throw new ApiError(400, 'invalid', field);
      }
      patch[field] = value.trim();
    }
    if ('description' in body) {
      const value = body.description;
      if (typeof value !== 'string' || value.length > 10_000) {
        throw new ApiError(400, 'invalid', 'description');
      }
      patch.description = value;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ video: existing });
    }

    const { data: updated, error } = await db()
      .from('gameplay_videos')
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
          to: existing.title,
        });
      }
      if (existing.linked_task_id && existing.linked_task_id !== nextTaskId) {
        await logActivity({
          taskId: existing.linked_task_id,
          actorId: session.userId,
          action: 'detached',
          from: existing.title,
        });
      }
    }

    return NextResponse.json({ video: updated as GameplayVideo });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const existing = await requireVideo(id);
    await requireRecordManager(existing.uploaded_by);

    // Keep the DB record until storage deletion succeeds, otherwise R2 sync
    // can recreate the video that was just removed from the database.
    for (const key of [existing.file_key, existing.thumbnail_key]) {
      if (!key) continue;
      try {
        await deleteObject(key);
      } catch (r2Err) {
        console.error('[r2] delete failed for', key, r2Err);
        throw new ApiError(502, 'system');
      }
    }

    const { error } = await db().from('gameplay_videos').delete().eq('id', id).eq('project_id', PROJECT_ID);
    if (error) throw dbError(error);

    if (existing.linked_task_id) {
      await logActivity({
        taskId: existing.linked_task_id,
        actorId: session.userId,
        action: 'detached',
        from: existing.title,
      });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return toErrorResponse(err);
  }
}
