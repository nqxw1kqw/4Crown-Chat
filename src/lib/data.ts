import { createAdminClient } from '@/lib/supabase/admin';
import { syncR2Objects } from '@/lib/r2/sync';
import { isSlotId, PROJECT_ID, USER_ID_TO_SLOT, DEFAULT_SLOT_NAMES } from '@/lib/constants';
import { ApiError, dbError } from '@/lib/api';
import { assertProjectKey, getPresignedVideoGetUrl } from '@/lib/r2/client';

const THUMBNAIL_TTL_SECONDS = 3600;
import type {
  BootstrapPayload,
  FileRecord,
  GameplayVideo,
  Project,
  Task,
  TaskActivity,
  TaskChecklistItem,
  TaskComment,
  TeamMember,
  UploadRecord,
  UploadStatus,
} from '@/types/database';

export function db() {
  return createAdminClient();
}

export async function getProject(): Promise<Project> {
  const { data, error } = await db()
    .from('projects')
    .select('*')
    .eq('id', PROJECT_ID)
    .maybeSingle();

  if (error) throw dbError(error);
  if (!data) throw new ApiError(500, 'unconfigured', 'seed');
  return data as Project;
}

export async function listMembers(): Promise<TeamMember[]> {
  const { data, error } = await db()
    .from('project_members')
    .select('role, user_id, profiles(*)')
    .eq('project_id', PROJECT_ID);

  if (error) throw dbError(error);

  return (data ?? [])
    .map((row): TeamMember | null => {
      const embedded: unknown = row.profiles;
      const profile = (Array.isArray(embedded) ? embedded[0] : embedded) as
        | { id?: unknown; slot?: unknown; display_name?: unknown }
        | null
        | undefined;

      if (!profile || typeof profile.id !== 'string') return null;

      const slot = isSlotId(profile.slot)
        ? profile.slot
        : (USER_ID_TO_SLOT[profile.id] ?? (isSlotId(row.user_id) ? row.user_id : null));

      if (!slot) return null;

      const defaultName = DEFAULT_SLOT_NAMES[slot] ?? slot;
      return {
        id: profile.id,
        slot,
        display_name:
          typeof profile.display_name === 'string' && profile.display_name
            ? profile.display_name
            : defaultName,
        role: row.role,
      };
    })
    .filter((member): member is TeamMember => member !== null)
    .sort((a, b) => a.slot.localeCompare(b.slot));
}

export async function attachChecklists(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return tasks;

  const { data, error } = await db()
    .from('task_checklist_items')
    .select('*')
    .in('task_id', tasks.map((task) => task.id))
    .order('position', { ascending: true });

  if (error) throw dbError(error);

  const grouped = new Map<string, TaskChecklistItem[]>();
  for (const item of (data ?? []) as TaskChecklistItem[]) {
    const list = grouped.get(item.task_id);
    if (list) list.push(item);
    else grouped.set(item.task_id, [item]);
  }

  return tasks.map((task) => ({ ...task, checklist: grouped.get(task.id) ?? [] }));
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await db()
    .from('tasks')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('created_at', { ascending: false });

  if (error) throw dbError(error);
  return attachChecklists((data ?? []) as Task[]);
}

export async function listVideos(): Promise<GameplayVideo[]> {
  await syncR2Objects();
  const { data, error } = await db()
    .from('gameplay_videos')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('created_at', { ascending: false });

  if (error) throw dbError(error);
  const videos = (data ?? []) as GameplayVideo[];

  // Presign là phép HMAC cục bộ, không gọi mạng nên ký sẵn cho cả lưới thumbnail.
  return Promise.all(
    videos.map(async (video) => {
      if (!video.thumbnail_key) return { ...video, thumbnail_url: null };
      try {
        const url = await getPresignedVideoGetUrl(
          assertProjectKey(video.thumbnail_key, PROJECT_ID),
          THUMBNAIL_TTL_SECONDS
        );
        return { ...video, thumbnail_url: url };
      } catch {
        return { ...video, thumbnail_url: null };
      }
    })
  );
}

export async function listFiles(): Promise<FileRecord[]> {
  await syncR2Objects();
  const { data, error } = await db()
    .from('files')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('created_at', { ascending: false });

  if (error) throw dbError(error);
  return Promise.all(((data ?? []) as FileRecord[]).map(async (file) => {
    if (!/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name)) return file;
    try { return { ...file, preview_url: await getPresignedVideoGetUrl(assertProjectKey(file.file_key, PROJECT_ID), THUMBNAIL_TTL_SECONDS) }; }
    catch { return file; }
  }));
}

export async function countComments(taskIds: string[]): Promise<Record<string, number>> {
  if (taskIds.length === 0) return {};

  const { data, error } = await db()
    .from('task_comments')
    .select('task_id')
    .in('task_id', taskIds);

  if (error) throw dbError(error);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { task_id: string }[]) {
    counts[row.task_id] = (counts[row.task_id] ?? 0) + 1;
  }
  return counts;
}

export async function getBootstrap(): Promise<BootstrapPayload> {
  const [project, members, tasks, videos, files] = await Promise.all([
    getProject(),
    listMembers(),
    listTasks(),
    listVideos(),
    listFiles(),
  ]);

  const commentCounts = await countComments(tasks.map((task) => task.id));

  return {
    project,
    members,
    tasks: tasks.map((task) => ({
      ...task,
      comment_count: commentCounts[task.id] ?? 0,
      attachment_count:
        files.filter((file) => file.linked_task_id === task.id).length +
        videos.filter((video) => video.linked_task_id === task.id).length,
    })),
    videos,
    files,
  };
}

export async function requireTaskInProject(taskId: string): Promise<Task> {
  const { data, error } = await db()
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('project_id', PROJECT_ID)
    .maybeSingle();

  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, 'not_found');
  return data as Task;
}

export interface TaskDetail {
  task: Task;
  comments: TaskComment[];
  activity: TaskActivity[];
  files: FileRecord[];
  videos: GameplayVideo[];
}

export async function getTaskDetail(taskId: string): Promise<TaskDetail> {
  const task = await requireTaskInProject(taskId);
  const [detailedTask] = await attachChecklists([task]);
  const client = db();

  const [commentsRes, activityRes, filesRes, videosRes] = await Promise.all([
    client.from('task_comments').select('*').eq('task_id', taskId).order('created_at', { ascending: true }),
    client
      .from('task_activity')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(50),
    client.from('files').select('*').eq('linked_task_id', taskId).order('created_at', { ascending: false }),
    client
      .from('gameplay_videos')
      .select('*')
      .eq('linked_task_id', taskId)
      .order('created_at', { ascending: false }),
  ]);

  for (const res of [commentsRes, activityRes, filesRes, videosRes]) {
    if (res.error) throw dbError(res.error);
  }

  return {
    task: detailedTask,
    comments: (commentsRes.data ?? []) as TaskComment[],
    activity: (activityRes.data ?? []) as TaskActivity[],
    files: (filesRes.data ?? []) as FileRecord[],
    videos: (videosRes.data ?? []) as GameplayVideo[],
  };
}

/** linked_task_id phải trỏ tới task có thật trong project, không nhận uuid tuỳ ý. */
export async function resolveLinkedTask(value: unknown): Promise<string | null> {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ApiError(400, 'invalid', 'linked_task_id');
  const task = await requireTaskInProject(value);
  return task.id;
}

export async function logActivity(entry: {
  taskId: string;
  actorId: string;
  action: TaskActivity['action'];
  field?: string | null;
  from?: string | null;
  to?: string | null;
}): Promise<void> {
  const { error } = await db().from('task_activity').insert({
    task_id: entry.taskId,
    actor_id: entry.actorId,
    action: entry.action,
    field: entry.field ?? null,
    from_value: entry.from ?? null,
    to_value: entry.to ?? null,
  });
  // Activity log là phần phụ: không được làm hỏng thao tác chính của người dùng.
  if (error) console.error('[activity] insert failed:', error.message);
}

/**
 * Lấy bản ghi upload đang chạy và khẳng định nó thuộc về người vừa đăng nhập.
 * Key R2 luôn đọc từ DB — client không bao giờ được tự khai báo key.
 */
export async function requireOwnedUpload(r2UploadId: unknown, userId: string): Promise<UploadRecord> {
  if (typeof r2UploadId !== 'string' || !r2UploadId) {
    throw new ApiError(400, 'invalid', 'uploadId');
  }

  const { data, error } = await db()
    .from('uploads')
    .select('*')
    .eq('r2_upload_id', r2UploadId)
    .eq('project_id', PROJECT_ID)
    .maybeSingle();

  if (error) throw dbError(error);
  if (!data) throw new ApiError(404, 'not_found');

  const upload = data as UploadRecord;
  if (upload.user_id !== userId) throw new ApiError(403, 'forbidden');
  if (upload.status !== 'pending') throw new ApiError(400, 'invalid', 'upload already finished');

  return upload;
}

export async function markUploadStatus(r2UploadId: string, status: UploadStatus): Promise<void> {
  const { error } = await db().from('uploads').update({ status }).eq('r2_upload_id', r2UploadId);
  if (error) console.error('[uploads] status update failed:', error.message);
}
