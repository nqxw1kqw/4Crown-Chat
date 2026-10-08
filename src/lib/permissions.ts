import { ProjectRole, Task } from '@/types/database';

/**
 * Các hàm kiểm tra phân quyền người dùng phía client (RBAC)
 * Lưu ý: Phân quyền thật sự BẮT BUỘC phải được bảo vệ tại Server API và Supabase RLS.
 */

export function canCreateTask(role: ProjectRole): boolean {
  return role !== 'VIEWER';
}

export function canEditTask(role: ProjectRole, task: Task, currentUserId: string): boolean {
  if (role === 'OWNER' || role === 'ADMIN') return true;
  if (role === 'MEMBER') {
    return task.assignee_id === currentUserId || task.creator_id === currentUserId;
  }
  return false;
}

export function canDeleteTask(role: ProjectRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canUpload(role: ProjectRole): boolean {
  return role !== 'VIEWER';
}

export function canDeleteMedia(role: ProjectRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canManageMembers(role: ProjectRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canDeleteProject(role: ProjectRole): boolean {
  return role === 'OWNER';
}

export function getRoleRestrictionMessage(actionName: string, role: ProjectRole): string {
  if (role === 'VIEWER') {
    return `Vai trò VIEWER chỉ có quyền xem, không thể ${actionName}.`;
  }
  return `Bạn không đủ thẩm quyền để ${actionName}.`;
}
