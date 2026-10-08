import { NextRequest, NextResponse } from 'next/server';
import { dbError, toErrorResponse } from '@/lib/api';
import { requireSession, requireTaskWrite } from '@/lib/auth-helpers';
import { db, logActivity, requireTaskInProject } from '@/lib/data';
import { parseChecklist } from '@/lib/validation';
import type { TaskChecklistItem } from '@/types/database';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const body = (await req.json().catch(() => null)) as { checklist?: unknown } | null;
    const checklist = parseChecklist(body?.checklist);

    const task = await requireTaskInProject(id);
    await requireTaskWrite(task);
    const client = db();

    const { error: deleteError } = await client.from('task_checklist_items').delete().eq('task_id', id);
    if (deleteError) throw dbError(deleteError);

    if (checklist.length > 0) {
      const { error: insertError } = await client.from('task_checklist_items').insert(
        checklist.map((item, position) => ({
          task_id: id,
          label: item.label,
          done: item.done,
          position,
        }))
      );
      if (insertError) throw dbError(insertError);
    }

    const doneCount = checklist.filter((item) => item.done).length;
    const progress = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : task.progress;

    const { data: updated, error } = await client
      .from('tasks')
      .update({ progress })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw dbError(error);

    const { data: items, error: itemsError } = await client
      .from('task_checklist_items')
      .select('*')
      .eq('task_id', id)
      .order('position', { ascending: true });
    if (itemsError) throw dbError(itemsError);

    if (progress !== task.progress) {
      await logActivity({
        taskId: id,
        actorId: session.userId,
        action: 'checklist',
        field: 'progress',
        from: String(task.progress),
        to: String(progress),
      });
    }

    return NextResponse.json({
      task: updated,
      checklist: (items ?? []) as TaskChecklistItem[],
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
