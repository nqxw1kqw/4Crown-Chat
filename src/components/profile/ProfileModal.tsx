'use client';

import React, { useState, useEffect } from 'react';
import { X, User, RotateCcw, Save, Shield } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { SlotId, SLOT_IDS, LocalProfileState, saveStoredProfile, resetStoredProfile } from '@/lib/profile';
import { ProjectRole } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: LocalProfileState;
  onUpdateProfile: (updated: LocalProfileState) => void;
  onResetIdentity: () => void;
}

const ROLE_OPTIONS: ProjectRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

const ROLE_BADGE_COLORS: Record<ProjectRole, string> = {
  OWNER: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
  ADMIN: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10',
  MEMBER: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  VIEWER: 'border-zinc-500/40 text-zinc-300 bg-zinc-500/10',
};

export default function ProfileModal({
  isOpen,
  onClose,
  currentProfile,
  onUpdateProfile,
  onResetIdentity,
}: ProfileModalProps) {
  const { t } = useLocale();
  const [activeSlot, setActiveSlot] = useState<SlotId>(currentProfile.currentSlotId || 'm1');
  const [activeRole, setActiveRole] = useState<ProjectRole>(currentProfile.role || 'ADMIN');
  const [editableNames, setEditableNames] = useState<Record<SlotId, string>>({
    ...currentProfile.names,
  });

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setActiveSlot(currentProfile.currentSlotId || 'm1');
      setActiveRole(currentProfile.role || 'ADMIN');
      setEditableNames({ ...currentProfile.names });
    }
  }

  // Đóng modal khi bấm Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNameChange = (slotId: SlotId, val: string) => {
    setEditableNames((prev) => ({
      ...prev,
      [slotId]: val,
    }));
  };

  const handleSave = () => {
    const updated: LocalProfileState = {
      currentSlotId: activeSlot,
      role: activeRole,
      names: {
        m1: editableNames.m1.trim() || currentProfile.names.m1,
        m2: editableNames.m2.trim() || currentProfile.names.m2,
        m3: editableNames.m3.trim() || currentProfile.names.m3,
        m4: editableNames.m4.trim() || currentProfile.names.m4,
      },
    };
    saveStoredProfile(updated);
    onUpdateProfile(updated);
    onClose();
  };

  const handleReset = () => {
    resetStoredProfile();
    onResetIdentity();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="relative w-full max-w-xl flex flex-col max-h-[90vh] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface)]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 id="profile-modal-title" className="text-base font-bold text-[var(--color-text)]">
                {t('profile.title')}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t('profile.renameHint')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-xl p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Section 1: Choose Active Slot */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">
              {t('profile.changeUser')}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {SLOT_IDS.map((slotId) => {
                const isSelected = activeSlot === slotId;
                const displayName = editableNames[slotId];
                return (
                  <button
                    key={slotId}
                    type="button"
                    onClick={() => setActiveSlot(slotId)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 shadow-sm ring-1 ring-[var(--color-accent)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)]'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-mono font-bold text-indigo-400 block">
                        {t('profile.slotLabel', { slot: slotId.toUpperCase() })}
                      </span>
                      <span className="text-xs font-bold text-[var(--color-text)] truncate block">
                        {displayName}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Choose Role */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">
              {t('profile.changeRole')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROLE_OPTIONS.map((role) => {
                const isSelected = activeRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRole(role)}
                    className={`p-2.5 rounded-xl border text-center transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 ring-1 ring-[var(--color-accent)] font-bold'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)]'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span className={`text-xs block ${ROLE_BADGE_COLORS[role]}`}>
                      {t(`role.${role}` as Parameters<typeof t>[0])}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] flex items-start gap-2">
              <Shield className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                {t(`role.desc.${activeRole}` as unknown as Parameters<typeof t>[0])}
              </span>
            </div>
          </div>

          {/* Section 3: Rename Slots */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                {t('profile.rename')}
              </label>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {t('profile.renameHint')}
              </span>
            </div>
            <Card className="p-3.5 space-y-3">
              {SLOT_IDS.map((slotId) => (
                <div key={slotId} className="flex items-center gap-3">
                  <span className="w-16 font-mono text-xs font-bold text-indigo-400 shrink-0">
                    {slotId.toUpperCase()}
                  </span>
                  <Input
                    value={editableNames[slotId]}
                    onChange={(e) => handleNameChange(slotId, e.target.value)}
                    placeholder={currentProfile.names[slotId]}
                    className="flex-1 text-xs py-1.5"
                  />
                </div>
              ))}
            </Card>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface)]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs"
            icon={RotateCcw}
          >
            {t('profile.reset')}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="text-xs font-bold"
              icon={Save}
            >
              {t('profile.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
