'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { memberAvatarUri } from '@/lib/avatars';
import { cn } from '@/lib/utils';

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-16 text-base',
} as const;

export type AvatarSize = keyof typeof SIZES;

interface MemberAvatarProps {
  slot?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
  /** Bọc tooltip tên khi avatar đứng một mình không có label bên cạnh. */
  tooltip?: boolean;
}

export default function MemberAvatar({ slot, name, size = 'md', className, tooltip = false }: MemberAvatarProps) {
  const initials = (name ?? '?').trim().slice(0, 1).toUpperCase();
  const avatar = (
    <Avatar className={cn('shrink-0', SIZES[size], className)}>
      <AvatarImage src={memberAvatarUri(slot)} alt={name ?? ''} className="object-cover" />
      <AvatarFallback className="bg-[var(--color-surface-raised)] font-semibold text-[var(--color-text-muted)]">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (!tooltip || !name) return avatar;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatar}</TooltipTrigger>
      <TooltipContent side="bottom">{name}</TooltipContent>
    </Tooltip>
  );
}

interface MemberAvatarStackProps {
  members: { slot: string; display_name: string }[];
  size?: AvatarSize;
  max?: number;
  className?: string;
}

export function MemberAvatarStack({ members, size = 'sm', max = 4, className }: MemberAvatarStackProps) {
  const shown = members.slice(0, max);
  const hidden = members.length - shown.length;

  return (
    <div className={cn('flex items-center -space-x-1.5', className)}>
      {shown.map((m) => (
        <MemberAvatar key={m.slot} slot={m.slot} name={m.display_name} size={size} tooltip className="ring-2 ring-background" />
      ))}
      {hidden > 0 && (
        <span className={cn('inline-flex items-center justify-center rounded-full bg-[var(--color-surface-raised)] font-semibold text-[var(--color-text-muted)] ring-2 ring-background', SIZES[size])}>
          +{hidden}
        </span>
      )}
    </div>
  );
}
