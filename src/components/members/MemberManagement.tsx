'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  UserPlus,
  Trash2,
  Crown,
  X,
} from 'lucide-react';
import { ProjectMember, Profile, ProjectRole } from '@/types/database';
import { canManageMembers, getRoleRestrictionMessage } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface MemberManagementProps {
  members: (ProjectMember & { profile: Profile })[];
  userRole: ProjectRole;
  currentUserId: string;
  onUpdateRole: (userId: string, newRole: ProjectRole) => void;
  onRemoveMember: (userId: string) => void;
  onAddMember: (displayName: string, role: ProjectRole) => void;
}

const ROLE_DEFINITIONS: Record<
  ProjectRole,
  { label: string; desc: string; badgeColor: string; icon: typeof Crown }
> = {
  OWNER: {
    label: 'OWNER (Chủ dự án)',
    desc: 'Toàn quyền dự án, đổi cấu hình, xóa dự án, quản lý mọi task và file.',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    icon: Crown,
  },
  ADMIN: {
    label: 'ADMIN (Quản trị)',
    desc: 'Quản lý thành viên, sửa mọi task, xóa file/video, duyệt tiến độ.',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    icon: Shield,
  },
  MEMBER: {
    label: 'MEMBER (Thành viên)',
    desc: 'Tạo task, sửa task được gán, tải lên video gameplay và file build.',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    icon: Users,
  },
  VIEWER: {
    label: 'VIEWER (Chỉ xem)',
    desc: 'Chỉ được xem dashboard, task, xem video và tải file. Không tạo/sửa.',
    badgeColor: 'bg-zinc-500/10 text-zinc-400 border-zinc-700/50',
    icon: ShieldAlert,
  },
};

export default function MemberManagement({
  members,
  userRole,
  currentUserId,
  onUpdateRole,
  onRemoveMember,
  onAddMember,
}: MemberManagementProps) {
  const { success, error: toastError } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<ProjectRole>('MEMBER');
  const [memberToRemove, setMemberToRemove] = useState<(ProjectMember & { profile: Profile }) | null>(null);

  const canManage = canManageMembers(userRole);

  // Bắt phím Esc để đóng modal thêm thành viên
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddModal) {
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    if (!canManage) {
      toastError('Không có quyền', getRoleRestrictionMessage('thêm thành viên', userRole));
      return;
    }

    onAddMember(newMemberName.trim(), newMemberRole);
    success('Thêm thành viên thành công', `Đã mời "${newMemberName.trim()}" với vai trò ${newMemberRole}`);
    setNewMemberName('');
    setNewMemberRole('MEMBER');
    setShowAddModal(false);
  };

  const handleRoleChange = (member: ProjectMember & { profile: Profile }, newRole: ProjectRole) => {
    if (!canManage) {
      toastError('Không có quyền', getRoleRestrictionMessage('thay đổi vai trò', userRole));
      return;
    }
    onUpdateRole(member.user_id, newRole);
    success('Đã cập nhật vai trò', `${member.profile.display_name} hiện là ${newRole}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" /> Quản lý Thành viên & Phân quyền (RBAC)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Phân quyền 4 cấp độ nghiêm ngặt: OWNER, ADMIN, MEMBER, VIEWER
          </p>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
          >
            <UserPlus className="h-4 w-4" /> Thêm Thành viên
          </button>
        ) : (
          <div
            title={getRoleRestrictionMessage('quản lý thành viên', userRole)}
            className="text-xs text-zinc-400 italic py-2 px-3 border border-zinc-800 rounded-xl bg-[#12141d]"
          >
            Chỉ OWNER và ADMIN mới có quyền quản lý thành viên
          </div>
        )}
      </div>

      {/* Permissions Matrix Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(ROLE_DEFINITIONS) as ProjectRole[]).map((r) => {
          const info = ROLE_DEFINITIONS[r];
          return (
            <div
              key={r}
              className="rounded-xl border border-zinc-800/80 bg-[#12141e] p-3.5 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${info.badgeColor}`}>
                  {r}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{info.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Members List Table */}
      <div className="rounded-2xl border border-[#1f2330] bg-[#12141d] overflow-hidden shadow-sm">
        <div className="divide-y divide-zinc-800/50">
          {members.map((m) => {
            const roleInfo = ROLE_DEFINITIONS[m.role];
            const isMe = m.user_id === currentUserId;
            const isOwner = m.role === 'OWNER';

            return (
              <div
                key={m.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#161924] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-sm overflow-hidden border border-zinc-700">
                    {m.profile.avatar_url ? (
                      <img src={m.profile.avatar_url} alt={m.profile.display_name} className="h-full w-full object-cover" />
                    ) : (
                      m.profile.display_name.charAt(0)
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-zinc-100">{m.profile.display_name}</h4>
                      {isMe && (
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded font-medium">
                          Bạn
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">ID: {m.user_id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {canManage && !isOwner ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m, e.target.value as ProjectRole)}
                      aria-label={`Thay đổi vai trò cho ${m.profile.display_name}`}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      {(['ADMIN', 'MEMBER', 'VIEWER'] as ProjectRole[]).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${roleInfo.badgeColor} font-semibold`}>
                      {m.role}
                    </span>
                  )}

                  {canManage && !isOwner && !isMe && (
                    <button
                      type="button"
                      onClick={() => setMemberToRemove(m)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                      aria-label={`Xóa thành viên ${m.profile.display_name} khỏi dự án`}
                      title="Xóa khỏi dự án"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-member-modal-title"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#12141e] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
              <h3 id="add-member-modal-title" className="text-base font-bold text-white">
                Thêm Thành viên mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Đóng cửa sổ thêm thành viên"
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Tên hiển thị *</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Ví dụ: Alex (Sound Designer)"
                  className="w-full rounded-xl border border-zinc-800 bg-[#171924] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Phân quyền</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as ProjectRole)}
                  className="w-full rounded-xl border border-zinc-800 bg-[#171924] px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="MEMBER">MEMBER (Thành viên - Được tạo task, upload)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên)</option>
                  <option value="VIEWER">VIEWER (Chỉ xem - Không được tạo/sửa/tải lên)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  Thêm vào Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ConfirmDialog khi xóa thành viên */}
      {memberToRemove && (
        <ConfirmDialog
          isOpen={!!memberToRemove}
          title="Xác nhận xóa thành viên"
          description="Thành viên này sẽ bị tước toàn bộ quyền truy cập vào dự án."
          targetName={`"${memberToRemove.profile.display_name}" (${memberToRemove.role})`}
          confirmLabel="Xóa khỏi dự án"
          cancelLabel="Hủy bỏ"
          isDangerous={true}
          onConfirm={() => {
            onRemoveMember(memberToRemove.user_id);
            success('Đã xóa thành viên', `Đã xóa ${memberToRemove.profile.display_name} khỏi dự án.`);
            setMemberToRemove(null);
          }}
          onCancel={() => setMemberToRemove(null)}
        />
      )}
    </div>
  );
}
