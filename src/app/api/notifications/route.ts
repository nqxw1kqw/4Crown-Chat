import { NextRequest, NextResponse } from 'next/server';
import { dbError, toErrorResponse } from '@/lib/api';
import { requireSession } from '@/lib/auth-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { db, listMembers } from '@/lib/data';
import { PROJECT_ID } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'notifications', 300, 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: limited.retryAfterSeconds },
        { status: 429 }
      );
    }

    const session = await requireSession();
    const client = db();

    // 1. Lấy toàn bộ task trong project để map title và quyền liên quan
    const { data: tasks, error: tasksError } = await client
      .from('tasks')
      .select('id, title, assignee_id, creator_id')
      .in('project_id', [PROJECT_ID, '00000000-0000-0000-0000-000000000001']);

    if (tasksError) throw dbError(tasksError);

    const taskMap = new Map((tasks ?? []).map((t) => [t.id, t]));
    const taskIds = Array.from(taskMap.keys());

    if (taskIds.length === 0) {
      return NextResponse.json({ notifications: [] });
    }

    // 2. Lấy hoạt động trên các task này do người KHÁC thực hiện (actor_id != session.userId)
    const { data: activities, error: actError } = await client
      .from('task_activity')
      .select('*')
      .in('task_id', taskIds)
      .neq('actor_id', session.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (actError) {
      console.warn('[notifications] task_activity query failed:', actError.message);
      return NextResponse.json({ notifications: [] });
    }

    // Lấy thông tin thành viên
    const members = await listMembers();
    const memberMap = new Map(members.map((m) => [m.id, m]));

    // 3. Nếu là comment mà to_value chưa có, lấy từ task_comments
    const commentTaskIds = (activities ?? [])
      .filter((a) => a.action === 'commented' && !a.to_value)
      .map((a) => a.task_id);

    const latestComments = new Map<string, string>();
    if (commentTaskIds.length > 0) {
      const { data: comments } = await client
        .from('task_comments')
        .select('task_id, body, created_at')
        .in('task_id', commentTaskIds)
        .order('created_at', { ascending: false });

      for (const c of comments ?? []) {
        if (!latestComments.has(c.task_id)) {
          latestComments.set(c.task_id, c.body);
        }
      }
    }

    const notifications = (activities ?? []).map((act) => {
      const task = taskMap.get(act.task_id);
      const actor = memberMap.get(act.actor_id);
      const isMine = task?.assignee_id === session.userId || task?.creator_id === session.userId;

      let summary = '';
      if (act.action === 'commented') {
        const snippet = act.to_value || latestComments.get(act.task_id) || '';
        summary = snippet ? `"${snippet}"` : 'Đã bình luận trên task';
      } else if (act.action === 'status_changed') {
        summary = `Đã đổi trạng thái sang ${act.to_value || ''}`;
      } else if (act.action === 'assignee_changed') {
        const assignedMember = memberMap.get(act.to_value ?? '');
        summary = assignedMember
          ? `Đã giao việc cho ${assignedMember.display_name}`
          : 'Đã đổi người phụ trách';
      } else {
        summary = 'Đã cập nhật thông tin task';
      }

      return {
        id: act.id,
        taskId: act.task_id,
        taskTitle: task?.title ?? 'Công việc',
        actorId: act.actor_id,
        actorName: actor?.display_name ?? 'Thành viên',
        actorSlot: actor?.slot ?? 'm1',
        action: act.action,
        summary,
        isDirectTarget: isMine,
        createdAt: act.created_at,
      };
    });

    return NextResponse.json({ notifications });
  } catch (err) {
    return toErrorResponse(err);
  }
}
