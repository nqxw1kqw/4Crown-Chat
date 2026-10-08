// Đã bỏ phân quyền theo yêu cầu Vòng 3. Vai trò chỉ là nhãn hiển thị cho đồng đội biết.
// Mọi thao tác tạo, sửa, xóa, tải lên đều luôn được cho phép.

export function canCreateTask(): boolean {
  return true;
}

export function canEditTask(): boolean {
  return true;
}

export function canDeleteTask(): boolean {
  return true;
}

export function canUpload(): boolean {
  return true;
}

export function canDeleteMedia(): boolean {
  return true;
}

export function canManageMembers(): boolean {
  return true;
}

export function canDeleteProject(): boolean {
  return true;
}
