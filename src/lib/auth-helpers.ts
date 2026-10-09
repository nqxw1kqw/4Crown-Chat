import { getSession, type SessionPayload } from '@/lib/session';
import { ApiError, dbError } from '@/lib/api';
import { db } from '@/lib/data';
import { PROJECT_ID } from '@/lib/constants';
import { atLeast, ROLE_RANK } from '@/lib/permissions';
import type { ProjectRole } from '@/types/database';

/**
 * Mọi route API đều phải đi qua đây. Không còn chế độ demo fallback:
 * trước đó hàm này luôn trả về OWNER khi thiếu phiên đăng nhập, khiến
 * /api/uploads/init và các route ký URL R2 mở toang cho người lạ.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, 'unauthorized');
  }
  return session;
}

/**
 * Vai trò thật trong `project_members`. Cookie chỉ là ảnh chụp lúc đăng nhập,
 * nên sau khi OWNER đổi vai trò thì phải đọc lại DB mới có hiệu lực ngay.
 */
export async function currentRole(session: SessionPayload): Promise<ProjectRole> {
  const { data, error } = await db()
    .from('project_members')
    .select('role')
    .eq('project_id', PROJECT_ID)
    .eq('user_id', session.userId)
    .maybeSingle();

  if (error) throw dbError(error);
  const role = data?.role as ProjectRole | undefined;
  // Slot đã bị Chủ dự án xoá khỏi team -> mất tư cách ghi dù cookie còn hạn.
  if (!role || !(role in ROLE_RANK)) throw new ApiError(403, 'forbidden', 'not-a-member');
  return role;
}

export interface Principal {
  session: SessionPayload;
  role: ProjectRole;
}

async function principal(minimum: ProjectRole): Promise<Principal> {
  const session = await requireSession();
  const role = await currentRole(session);
  if (!atLeast(role, minimum)) throw new ApiError(403, 'forbidden');
  return { session, role };
}

/** VIEWER chỉ được đọc; mọi thao tác ghi đều phải qua hàm này. */
export function requireContributor(): Promise<Principal> {
  return principal('MEMBER');
}

export function requireAtLeast(minimum: ProjectRole): Promise<Principal> {
  return principal(minimum);
}

/** OWNER/ADMIN chạm được mọi task; MEMBER chỉ task mình tạo hoặc được giao. */
export async function requireTaskWrite(
  task: { creator_id: string | null; assignee_id: string | null }
): Promise<Principal> {
  const { session, role } = await principal('MEMBER');
  if (atLeast(role, 'ADMIN')) return { session, role };
  if (task.creator_id !== session.userId && task.assignee_id !== session.userId) {
    throw new ApiError(403, 'forbidden');
  }
  return { session, role };
}

/** Xóa task: chỉ người tạo hoặc OWNER/ADMIN. */
export async function requireTaskDelete(task: { creator_id: string | null }): Promise<Principal> {
  const { session, role } = await principal('MEMBER');
  if (!atLeast(role, 'ADMIN') && task.creator_id !== session.userId) {
    throw new ApiError(403, 'forbidden');
  }
  return { session, role };
}

/** File/video trong kho: người tải lên hoặc OWNER/ADMIN. */
export async function requireRecordManager(uploadedBy: string | null): Promise<Principal> {
  const { session, role } = await principal('MEMBER');
  if (!atLeast(role, 'ADMIN') && uploadedBy !== session.userId) {
    throw new ApiError(403, 'forbidden');
  }
  return { session, role };
}
