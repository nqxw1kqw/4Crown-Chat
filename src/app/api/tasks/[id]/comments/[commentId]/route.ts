import { NextRequest, NextResponse } from 'next/server';
import { dbError, toErrorResponse, ApiError } from '@/lib/api';
import { requireAtLeast, requireSession } from '@/lib/auth-helpers';
import { db } from '@/lib/data';

interface RouteParams {
  id: string;
  commentId: string;
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  try {
    const session = await requireSession();
    const { id, commentId } = await params;

    const client = db();
    const { data: comment, error: findError } = await client
      .from('task_comments')
      .select('*')
      .eq('id', commentId)
      .eq('task_id', id)
      .maybeSingle();

    if (findError) throw dbError(findError);
    if (!comment) throw new ApiError(404, 'not_found');
    if (comment.author_id !== session.userId) await requireAtLeast('ADMIN');

    const { error } = await client.from('task_comments').delete().eq('id', commentId);
    if (error) throw dbError(error);

    return NextResponse.json({ success: true, id: commentId });
  } catch (err) {
    return toErrorResponse(err);
  }
}
