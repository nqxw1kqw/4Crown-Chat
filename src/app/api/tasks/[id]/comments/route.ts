import { NextRequest, NextResponse } from 'next/server';
import { dbError, toErrorResponse } from '@/lib/api';
import { requireContributor } from '@/lib/auth-helpers';
import { db, logActivity, requireTaskInProject } from '@/lib/data';
import { parseCommentBody } from '@/lib/validation';
import type { TaskComment } from '@/types/database';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireContributor();
    const { id } = await params;

    const body = (await req.json().catch(() => null)) as { body?: unknown } | null;
    const text = parseCommentBody(body?.body);

    await requireTaskInProject(id);

    const { data: created, error } = await db()
      .from('task_comments')
      .insert({ task_id: id, author_id: session.userId, body: text })
      .select('*')
      .single();

    if (error) throw dbError(error);

    await logActivity({
      taskId: id,
      actorId: session.userId,
      action: 'commented',
      to: text.slice(0, 150),
    });

    return NextResponse.json({ comment: created as TaskComment }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
