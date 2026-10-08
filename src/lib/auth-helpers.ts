import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProjectRole } from '@/types/database';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  role: ProjectRole;
}

/**
 * Kiểm tra xác thực người dùng và vai trò thành viên trong project
 */
export async function verifyProjectAccess(
  projectId: string,
  minRoles: ProjectRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
): Promise<AuthContext> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Chưa đăng nhập');
  }

  const { data: membership, error: memberError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    throw new Error('Bạn không phải là thành viên của dự án này');
  }

  const userRole = membership.role as ProjectRole;

  if (!minRoles.includes(userRole)) {
    throw new Error('Bạn không có quyền thực hiện thao tác này trong dự án');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    role: userRole,
  };
}
