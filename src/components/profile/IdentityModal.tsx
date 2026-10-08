'use client';

import React, { useState } from 'react';
import { UserCheck, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { SlotId, SLOT_IDS, LocalProfileState, saveStoredProfile } from '@/lib/profile';
import { ProjectRole } from '@/types/database';
import { Button } from '@/components/ui/Button';

interface IdentityModalProps {
  isOpen: boolean;
  currentProfile: LocalProfileState;
  onSelectIdentity: (updated: LocalProfileState) => void;
}

const ROLE_OPTIONS: ProjectRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

const ROLE_BADGE_COLORS: Record<ProjectRole, string> = {
  OWNER: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
  ADMIN: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10',
  MEMBER: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  VIEWER: 'border-zinc-500/40 text-zinc-300 bg-zinc-500/10',
};

export default function IdentityModal({
  isOpen,
  currentProfile,
  onSelectIdentity,
}: IdentityModalProps) {
  const { t } = useLocale();
  const [selectedSlot, setSelectedSlot] = useState<SlotId | null>(currentProfile.currentSlotId || 'm1');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>(currentProfile.role || 'ADMIN');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedSlot) return;
    const updated: LocalProfileState = {
      ...currentProfile,
      currentSlotId: selectedSlot,
      role: selectedRole,
    };
    saveStoredProfile(updated);
    onSelectIdentity(updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-modal-title"
    >
      <div className="relative w-full max-w-xl flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/20 mb-1">
            <UserCheck className="h-6 w-6" />
          </div>
          <h2 id="identity-modal-title" className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight">
            {t('identity.pickTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
            {t('identity.pickDescription')}
          </p>
        </div>

        {/* Slot Selection Grid (4 slots) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">
            {t('profile.currentSlot')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {SLOT_IDS.map((slotId) => {
              const name = currentProfile.names[slotId];
              const isSelected = selectedSlot === slotId;
              return (
                <button
                  key={slotId}
                  type="button"
                  onClick={() => setSelectedSlot(slotId)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 shadow-md shadow-indigo-950/30 ring-1 ring-[var(--color-accent)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)]'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 block mb-0.5">
                      {t('profile.slotLabel', { slot: slotId.toUpperCase() })}
                    </span>
                    <span className="text-sm font-bold text-[var(--color-text)] truncate block">
                      {name}
                    </span>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                        : 'border-[var(--color-border-strong)] bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Role Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">
            {t('identity.selectRole')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ROLE_OPTIONS.map((role) => {
              const isSelected = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)]'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${ROLE_BADGE_COLORS[role]}`}>
                      {role}
                    </span>
                    {isSelected && <ShieldCheck className="h-4 w-4 text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">
                    {t(`role.desc.${role}` as unknown as Parameters<typeof t>[0])}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full justify-center text-sm font-bold py-3.5"
            onClick={handleConfirm}
            disabled={!selectedSlot}
            icon={Sparkles}
          >
            {t('identity.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
