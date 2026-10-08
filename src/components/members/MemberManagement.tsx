'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  X,
} from 'lucide-react';
import { ProjectMember, Profile, ProjectRole } from '@/types/database';
import { canManageMembers, getRoleRestrictionMessage } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';
import { useLocale } from '@/i18n/useLocale';
import { TranslationKey } from '@/i18n/dictionaries/vi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RoleBadge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface MemberManagementProps {
  members: (ProjectMember & { profile: Profile })[];
  userRole: ProjectRole;
  currentUserId: string;
  onUpdateRole: (userId: string, newRole: ProjectRole) => void;
  onRemoveMember: (userId: string) => void;
  onAddMember: (displayName: string, role: ProjectRole) => void;
}

const ALL_ROLES: ProjectRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

export default function MemberManagement({
  members,
  userRole,
  currentUserId,
  onUpdateRole,
  onRemoveMember,
  onAddMember,
}: MemberManagementProps) {
  const { t } = useLocale();
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
      toastError(t('tasks.noPermission'), getRoleRestrictionMessage(t('action.addMember'), userRole, t));
      return;
    }

    onAddMember(newMemberName.trim(), newMemberRole);
    success(
      t('members.addSuccessTitle'),
      t('members.addSuccessMsg', {
        name: newMemberName.trim(),
        role: t(`role.${newMemberRole}` as TranslationKey),
      })
    );
    setNewMemberName('');
    setNewMemberRole('MEMBER');
    setShowAddModal(false);
  };

  const handleRoleChange = (member: ProjectMember & { profile: Profile }, newRole: ProjectRole) => {
    if (!canManage) {
      toastError(t('tasks.noPermission'), getRoleRestrictionMessage(t('action.changeRole'), userRole, t));
      return;
    }
    onUpdateRole(member.user_id, newRole);
    success(
      t('members.roleUpdatedTitle'),
      t('members.roleUpdatedMsg', {
        name: member.profile.display_name,
        role: t(`role.${newRole}` as TranslationKey),
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" /> {t('members.title')}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {t('members.subtitle')}
          </p>
        </div>

        {canManage ? (
          <Button
            onClick={() => setShowAddModal(true)}
            icon={UserPlus}
          >
            {t('members.addBtn')}
          </Button>
        ) : (
          <Tooltip content={t('members.noManagePerm')}>
            <Button
              disabled
              icon={UserPlus}
            >
              {t('members.addBtn')}
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Permissions Matrix Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ALL_ROLES.map((r) => {
          return (
            <Card
              key={r}
              padding="sm"
              className="space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <RoleBadge role={r} />
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                {t(`roleDesc.${r}` as TranslationKey)}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Members List Table */}
      <Card padding="none" className="overflow-hidden shadow-sm">
        <div className="divide-y divide-[var(--color-border)]">
          {members.map((m) => {
            const isMe = m.user_id === currentUserId;
            const isOwner = m.role === 'OWNER';

            return (
              <div
                key={m.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--color-surface-raised)] transition-colors duration-150"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-sm overflow-hidden border border-[var(--color-border-strong)]">
                    {m.profile.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={m.profile.avatar_url} alt={m.profile.display_name} className="h-full w-full object-cover" />
                    ) : (
                      m.profile.display_name.charAt(0)
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[var(--color-text)]">{m.profile.display_name}</h4>
                      {isMe && (
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-medium border border-indigo-500/20">
                          {t('members.youBadge')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">ID: {m.user_id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {canManage && !isOwner ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m, e.target.value as ProjectRole)}
                      aria-label={t('members.changeRoleAria', { name: m.profile.display_name })}
                      className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
                    >
                      {(['ADMIN', 'MEMBER', 'VIEWER'] as ProjectRole[]).map((r) => (
                        <option key={r} value={r}>
                          {t(`role.${r}` as TranslationKey)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <RoleBadge role={m.role} />
                  )}

                  {canManage && !isOwner && !isMe && (
                    <button
                      type="button"
                      onClick={() => setMemberToRemove(m)}
                      className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-rose-950/20 transition-colors cursor-pointer"
                      aria-label={t('members.removeMemberAria', { name: m.profile.display_name })}
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Add Member Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-member-modal-title"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-4">
              <h3 id="add-member-modal-title" className="text-base font-bold text-[var(--color-text)]">
                {t('members.modalAddTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label={t('members.closeModalAria')}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
                  {t('members.formName')}
                </label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder={t('members.formNamePlaceholder')}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text)] block mb-1">
                  {t('members.formRole')}
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as ProjectRole)}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
                >
                  <option value="MEMBER">{t('members.formRoleMember')}</option>
                  <option value="ADMIN">{t('members.formRoleAdmin')}</option>
                  <option value="VIEWER">{t('members.formRoleViewer')}</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                >
                  {t('members.formSubmit')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ConfirmDialog khi xóa thành viên */}
      {memberToRemove && (
        <ConfirmDialog
          isOpen={!!memberToRemove}
          title={t('members.deleteConfirmTitle')}
          description={t('members.deleteConfirmDesc')}
          targetName={`"${memberToRemove.profile.display_name}" (${t(`role.${memberToRemove.role}` as TranslationKey)})`}
          confirmLabel={t('members.deleteConfirmBtn')}
          cancelLabel={t('common.cancel')}
          isDangerous={true}
          onConfirm={() => {
            onRemoveMember(memberToRemove.user_id);
            success(
              t('members.removeSuccessTitle'),
              t('members.removeSuccessMsg', { name: memberToRemove.profile.display_name })
            );
            setMemberToRemove(null);
          }}
          onCancel={() => setMemberToRemove(null)}
        />
      )}
    </div>
  );
}
