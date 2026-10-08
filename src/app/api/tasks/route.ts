import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DEFAULT_PROJECT_ID, toProjectUuid } from '@/lib/constants';
import { Task } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || DEFAULT_PROJECT_ID;
    const projectUuid = toProjectUuid(projectId);

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectUuid)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ tasks: [] });
    }

    return NextResponse.json({ tasks: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi lấy tasks';
    return NextResponse.json({ error: message, tasks: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = body as Partial<Task>;

    const projectId = task.project_id || DEFAULT_PROJECT_ID;
    const projectUuid = toProjectUuid(projectId);

    const supabase = await createServerSupabaseClient();

    // Đảm bảo project row tồn tại
    try {
      await supabase.from('projects').upsert(
        { id: projectUuid, name: 'Game Team Project', status: 'active' },
        { onConflict: 'id' }
      );
    } catch {}

    const isUuid = (val?: string | null) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

    const insertPayload: Record<string, unknown> = {
      project_id: projectUuid,
      title: task.title || 'Công việc mới',
      description: task.description || '',
      status: task.status || 'TODO',
      priority: task.priority || 'NORMAL',
      progress: task.progress || 0,
      deadline: task.deadline || null,
      assignee_id: isUuid(task.assignee_id) ? task.assignee_id : null,
      creator_id: isUuid(task.creator_id) ? task.creator_id : null,
    };

    if (task.id && isUuid(task.id)) {
      insertPayload.id = task.id;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.warn('Lỗi insert task vào DB:', error.message);
      return NextResponse.json({ task: { ...task, id: task.id || `task-${crypto.randomUUID()}` } });
    }

    return NextResponse.json({ task: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi tạo task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body as { id: string } & Partial<Task>;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu task id' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const isUuid = (val?: string | null) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

    const sanitizedUpdates: Record<string, unknown> = { ...updates };
    if ('assignee_id' in updates && !isUuid(updates.assignee_id)) {
      delete sanitizedUpdates.assignee_id;
    }
    if ('creator_id' in updates && !isUuid(updates.creator_id)) {
      delete sanitizedUpdates.creator_id;
    }
    if ('project_id' in updates) {
      sanitizedUpdates.project_id = toProjectUuid(updates.project_id);
    }

    if (isUuid(id)) {
      await supabase.from('tasks').update(sanitizedUpdates).eq('id', id);
    }

    return NextResponse.json({ success: true, updated: body });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi cập nhật task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        const supabase = await createServerSupabaseClient();
        await supabase.from('tasks').delete().eq('id', id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi xóa task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
