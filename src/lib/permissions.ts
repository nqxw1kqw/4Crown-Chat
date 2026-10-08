import type { ProjectRole } from '@/types/database';

export const ROLE_RANK: Record<ProjectRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function atLeast(role: ProjectRole, minimum: ProjectRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/**
 * Cùng bộ điều kiện với các require* trong src/lib/auth-helpers.ts:
 * UI chỉ ẩn nút khi API chắc chắn sẽ trả 403.
 */
export interface Permissions {
  contribute: boolean;
  editTask: (task: { creator_id: string | null; assignee_id: string | null }) => boolean;
  deleteTask: (task: { creator_id: string | null }) => boolean;
  manageRecord: (uploadedBy: string | null) => boolean;
  /** ADMIN+: đổi tên thành viên và xoá bình luận của người khác. */
  manageTeam: boolean;
  /** OWNER: đổi vai trò, thêm/bỏ slot. */
  manageRoles: boolean;
}

export function permissionsFor(role: ProjectRole, userId: string): Permissions {
  const manager = atLeast(role, 'ADMIN');
  const writable = atLeast(role, 'MEMBER');
  return {
    contribute: writable,
    editTask: (task) => manager || (writable && (task.creator_id === userId || task.assignee_id === userId)),
    deleteTask: (task) => manager || (writable && task.creator_id === userId),
    manageRecord: (uploadedBy) => manager || (writable && uploadedBy === userId),
    manageTeam: manager,
    manageRoles: role === 'OWNER',
  };
}

/** Trạng thái trước khi đăng nhập: mọi khối UI có nút ghi đều bị ẩn. */
export const READ_ONLY: Permissions = {
  contribute: false,
  editTask: () => false,
  deleteTask: () => false,
  manageRecord: () => false,
  manageTeam: false,
  manageRoles: false,
};
