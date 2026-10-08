'use client';

import React, { useEffect, useState } from 'react';
import { X, LogOut, Save, Shield, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import type { TranslationKey } from '@/i18n/dictionaries/vi';
import { DEFAULT_SLOT_NAMES, SLOT_IDS, type SlotId } from '@/lib/constants';
import { ApiClientError } from '@/lib/api-client';
import { useAppData } from '@/components/providers/AppDataProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldInput, FieldSelect } from '@/components/common/form';
import { RoleBadge } from '@/components/common/badges';
import MemberAvatar from '@/components/common/member-avatar';
import { useToast } from '@/components/ui/Toast';
import type { ProjectRole } from '@/types/database';

interface ProfileModalProps {
  onClose: () => void;
}

const ROLE_BADGE_COLORS: Record<ProjectRole, string> = {
  OWNER: 'rounded-md border-[#974F0C]/40 text-[var(--color-warning)] bg-[var(--color-warning-soft)]',
  ADMIN: 'rounded-md border-[var(--color-brand)]/40 text-[var(--color-brand-hover)] bg-[var(--color-brand-soft)]',
  MEMBER: 'rounded-md border-[var(--color-success)]/60 text-[var(--color-success-text)] bg-[var(--color-success-soft)]',
  VIEWER: 'rounded-md border-[var(--color-border-strong)] text-[var(--color-text-muted)] bg-[var(--color-surface-raised)]',
};

const ROLE_OPTIONS: ProjectRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { t } = useLocale();
  const { success, error } = useToast();
  const { session, can, members, myRole, renameMembers, updateTeam, logout } = useAppData();

  const [names, setNames] = useState<Record<SlotId, string>>(() => {
    const next = { ...DEFAULT_SLOT_NAMES };
    for (const member of members) next[member.slot] = member.display_name;
    return next;
  });
  // null = slot đang bị loại khỏi team.
  const [roles, setRoles] = useState<Record<SlotId, ProjectRole | null>>(() => {
    const next = { m1: null, m2: null, m3: null, m4: null } as Record<SlotId, ProjectRole | null>;
    for (const member of members) next[member.slot] = member.role;
    return next;
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!session) return null;

  const role = myRole ?? session.role;
  const currentMemberName =
    members.find((m) => m.slot === session.slot)?.display_name ?? session.slot.toUpperCase();

  const teamPatch = (): { roles?: Record<SlotId, ProjectRole>; add?: Record<SlotId, ProjectRole>; remove: SlotId[] } => {
    const changedRoles = {} as Record<SlotId, ProjectRole>;
    const added = {} as Record<SlotId, ProjectRole>;
    const removed: SlotId[] = [];
    for (const slot of SLOT_IDS) {
      if (slot === session.slot) continue;
      const current = members.find((m) => m.slot === slot)?.role ?? null;
      const desired = roles[slot];
      if (current === desired) continue;
      if (desired === null) removed.push(slot);
      else if (current === null) added[slot] = desired;
      else changedRoles[slot] = desired;
    }
    return { roles: changedRoles, add: added, remove: removed };
  };

  const namePatch = (): Partial<Record<SlotId, string>> => {
    const next: Partial<Record<SlotId, string>> = {};
    for (const slot of SLOT_IDS) {
      const cleaned = names[slot].trim();
      if (!cleaned) continue;
      const current = members.find((m) => m.slot === slot)?.display_name;
      if (current !== undefined && current !== cleaned) next[slot] = cleaned;
    }
    return next;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const pendingNames = namePatch();
      if (Object.keys(pendingNames).length > 0) await renameMembers(pendingNames);

      if (can.manageRoles) {
        const patch = teamPatch();
        if (
          patch.remove.length > 0 ||
          Object.keys(patch.roles ?? {}).length > 0 ||
          Object.keys(patch.add ?? {}).length > 0
        ) {
          await updateTeam(patch);
        }
      }

      success(t('profile.save'), t('profile.savedMsg'));
      onClose();
    } catch (err) {
      error(
        t('profile.save'),
        err instanceof ApiClientError
          ? t(`apiError.${err.code}` as TranslationKey)
          : t('profile.saveFailedMsg')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchIdentity = async () => {
    await logout();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-[#091E42]/45 p-4 backdrop-blur-sm fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <MemberAvatar slot={session.slot} name={currentMemberName} size="md" />
            <div>
              <h3 id="profile-modal-title" className="text-sm font-semibold text-[var(--color-text)]">
                {t('profile.title')}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">{t('profile.renameHint')}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-[var(--color-text-muted)]"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          <Card className="flex-row items-center justify-between gap-3 p-4 shadow-none">
            <div className="min-w-0">
              <span className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                {t('profile.currentIdentity')}
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--color-text)]">
                {currentMemberName}
                <span className="ml-2 font-mono text-[11px] font-medium text-[var(--color-brand)]">
                  {t('profile.slotLabel', { slot: session.slot.toUpperCase() })}
                </span>
              </span>
            </div>
            <RoleBadge role={role} className={ROLE_BADGE_COLORS[role]} />
          </Card>

          <div className="flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-muted)]">
            <Shield className="mt-0.5 size-4 shrink-0 text-[var(--color-brand)]" />
            <span>{t(`role.desc.${role}` as unknown as Parameters<typeof t>[0])}</span>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              {t('profile.rename')}
            </span>
            <Card className="gap-3 p-4 shadow-none">
              {(can.manageTeam ? SLOT_IDS : [session.slot]).map((slotId) => (
                <div key={slotId} className="flex items-center gap-3">
                  <MemberAvatar slot={slotId} name={names[slotId]} size="sm" />
                  <span className="w-10 shrink-0 font-mono text-xs font-semibold text-[var(--color-text-muted)]">
                    {slotId.toUpperCase()}
                  </span>
                  <FieldInput
                    value={names[slotId]}
                    onChange={(e) => setNames((prev) => ({ ...prev, [slotId]: e.target.value }))}
                    maxLength={40}
                    placeholder={slotId.toUpperCase()}
                    aria-label={t('profile.slotLabel', { slot: slotId.toUpperCase() })}
                    className="flex-1 text-xs"
                  />
                </div>
              ))}
            </Card>
          </div>

          {can.manageRoles && (
            <div className="space-y-2">
              <span className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                {t('profile.teamTitle')}
              </span>
              <p className="text-[11px] text-[var(--color-text-muted)]">{t('profile.teamHint')}</p>
              <Card className="gap-3 p-4 shadow-none">
                {SLOT_IDS.map((slotId) => {
                  const isSelf = slotId === session.slot;
                  const inTeam = roles[slotId] !== null;
                  return (
                    <div key={slotId} className="flex flex-wrap items-center gap-3">
                      <MemberAvatar slot={slotId} name={names[slotId]} size="sm" />
                      <span className="w-10 shrink-0 font-mono text-xs font-semibold text-[var(--color-text-muted)]">
                        {slotId.toUpperCase()}
                      </span>
                      <FieldSelect
                        value={roles[slotId] ?? ''}
                        disabled={isSelf}
                        aria-label={t('profile.roleLabel', { slot: slotId.toUpperCase() })}
                        onChange={(event) =>
                          setRoles((prev) => ({
                            ...prev,
                            [slotId]: (event.target.value || null) as ProjectRole | null,
                          }))
                        }
                        className="h-8 w-auto min-w-[7.5rem] flex-1 sm:flex-none"
                      >
                        {!inTeam && !isSelf && <option value="">{t('profile.notInTeam')}</option>}
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {t(`role.${option}` as TranslationKey)}
                          </option>
                        ))}
                      </FieldSelect>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() =>
                            setRoles((prev) => ({ ...prev, [slotId]: inTeam ? null : 'MEMBER' }))
                          }
                          aria-label={inTeam ? t('profile.removeFromTeam') : t('profile.addToTeam')}
                          title={inTeam ? t('profile.removeFromTeam') : t('profile.addToTeam')}
                          className="cursor-pointer rounded-md p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]"
                        >
                          {inTeam ? <UserMinus className="size-4" /> : <UserPlus className="size-4" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </Card>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSwitchIdentity}
            className="text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
          >
            <LogOut className="size-4" />
            {t('profile.switchIdentity')}
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {t('profile.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
