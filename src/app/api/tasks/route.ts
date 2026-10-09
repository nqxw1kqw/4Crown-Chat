import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse, ApiError } from '@/lib/api';
import { requireContributor, requireSession } from '@/lib/auth-helpers';
import { attachChecklists, db, listTasks, logActivity } from '@/lib/data';
import { PROJECT_ID } from '@/lib/constants';
import type { Task } from '@/types/database';
import {
  parseAssignee,
  parseChecklist,
  parseDeadline,
  parseDescription,
  parsePriority,
  parseStatus,
  parseTag,
  parseTitle,
} from '@/lib/validation';

export async function GET() {
  try {
    await requireSession();
    return NextResponse.json({ tasks: await listTasks() });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireContributor();
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError(400, 'invalid');

    const title = parseTitle(body.title);
    const description = parseDescription(body.description);
    const status = parseStatus(body.status, 'TODO');
    const priority = parsePriority(body.priority, 'NORMAL');
    const tag = parseTag(body.tag);
    const assigneeId = parseAssignee(body.assignee_id);
    const deadline = parseDeadline(body.deadline);
    const checklist = body.checklist === undefined ? [] : parseChecklist(body.checklist);

    const client = db();
    const taskPayload: Record<string, unknown> = {
      project_id: PROJECT_ID,
      title,
      description,
      status,
      priority,
      tag,
      assignee_id: assigneeId,
      creator_id: session.userId,
      progress: 0,
      deadline,
    };

    let { data: created, error } = await client
      .from('tasks')
      .insert(taskPayload)
      .select('*')
      .single();

    if (error && (error.message.includes('tag') || (error as { code?: string }).code === 'PGRST204')) {
      delete taskPayload.tag;
      const retry = await client.from('tasks').insert(taskPayload).select('*').single();
      created = retry.data;
      error = retry.error;
    }

    if (error) throw new Error(error.message);

    if (checklist.length > 0) {
      const { error: checklistError } = await client.from('task_checklist_items').insert(
        checklist.map((item, position) => ({
          task_id: (created as Task).id,
          label: item.label,
          done: item.done,
          position,
        }))
      );
      if (checklistError) throw new Error(checklistError.message);
    }

    const [task] = await attachChecklists([created as Task]);

    await logActivity({ taskId: task.id, actorId: session.userId, action: 'created', to: title });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
