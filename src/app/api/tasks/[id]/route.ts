import { NextRequest, NextResponse } from 'next/server';
import { dbError, toErrorResponse, ApiError } from '@/lib/api';
import { requireSession, requireTaskDelete, requireTaskWrite } from '@/lib/auth-helpers';
import { db, getTaskDetail, logActivity, requireTaskInProject } from '@/lib/data';
import type { Task } from '@/types/database';
import {
  parseAssignee,
  parseDeadline,
  parseDescription,
  parsePriority,
  parseProgress,
  parseStatus,
  parseTag,
  parseTitle,
} from '@/lib/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireSession();
    const { id } = await params;
    return NextResponse.json(await getTaskDetail(id));
  } catch (err) {
    return toErrorResponse(err);
  }
}

const TRACKED_FIELDS = [
  'title',
  'description',
  'status',
  'priority',
  'tag',
  'assignee_id',
  'deadline',
  'progress',
] as const;

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError(400, 'invalid');

    const existing = await requireTaskInProject(id);
    await requireTaskWrite(existing);

    const patch: Record<string, unknown> = {};
    if ('title' in body) patch.title = parseTitle(body.title);
    if ('description' in body) patch.description = parseDescription(body.description);
    if ('status' in body) patch.status = parseStatus(body.status, existing.status);
    if ('priority' in body) patch.priority = parsePriority(body.priority, existing.priority);
    if ('tag' in body) patch.tag = parseTag(body.tag);
    if ('assignee_id' in body) patch.assignee_id = parseAssignee(body.assignee_id);
    if ('deadline' in body) patch.deadline = parseDeadline(body.deadline);
    if ('progress' in body) patch.progress = parseProgress(body.progress, existing.progress);

    const changes = TRACKED_FIELDS.filter((field) => {
      if (!(field in patch)) return false;
      const before = existing[field as keyof Task];
      const after = patch[field];
      return (before ?? null) !== (after ?? null);
    });

    if (changes.length > 0) {
      const { data: updated, error } = await db()
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .eq('project_id', existing.project_id)
        .select('*')
        .single();

      if (error) throw dbError(error);

      for (const field of changes) {
        const before = existing[field as keyof Task];
        await logActivity({
          taskId: id,
          actorId: session.userId,
          action: field === 'status' ? 'status_changed' : field === 'assignee_id' ? 'assignee_changed' : 'updated',
          field,
          from: before === null || before === undefined ? null : String(before),
          to: patch[field] === null || patch[field] === undefined ? null : String(patch[field]),
        });
      }

      return NextResponse.json({ task: updated as Task });
    }

    return NextResponse.json({ task: existing });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireSession();
    const { id } = await params;

    const existing = await requireTaskInProject(id);
    await requireTaskDelete(existing);
    const { error } = await db().from('tasks').delete().eq('id', id).eq('project_id', existing.project_id);
    if (error) throw dbError(error);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return toErrorResponse(err);
  }
}
