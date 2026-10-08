import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProjectRole } from '@/types/database';
import { DEFAULT_USER_ID } from '@/lib/constants';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  role: ProjectRole;
}

/**
 * Kiểm tra xác thực người dùng và vai trò thành viên trong project.
 * Hỗ trợ chế độ Demo / MVP khi chưa có phiên đăng nhập Supabase Auth.
 */
export async function verifyProjectAccess(
  projectId: string,
  minRoles: ProjectRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
): Promise<AuthContext> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 1. Nếu có phiên đăng nhập Supabase Auth thật
    if (!authError && user) {
      const { data: membership, error: memberError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!memberError && membership) {
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
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('không có quyền')) {
      throw err;
    }
    // Gặp lỗi kết nối Supabase hoặc thiếu auth thì fallback sang demo
  }

  // 2. Chế độ Demo / MVP fallback (mặc định Katsuragi Shin - OWNER)
  return {
    user: {
      id: DEFAULT_USER_ID,
      email: 'shin@gameteam.local',
    },
    role: 'OWNER',
  };
}
