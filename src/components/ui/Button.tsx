'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: LucideIcon;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

  const variants = {
    primary: 'bg-[var(--color-accent)] text-white hover:bg-indigo-500 shadow-sm shadow-indigo-500/20 active:translate-y-[1px]',
    secondary:
      'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-border)] border border-[var(--color-border-strong)] active:translate-y-[1px]',
    danger: 'bg-[var(--color-danger)] text-white hover:bg-rose-500 shadow-sm shadow-rose-500/20 active:translate-y-[1px]',
    ghost: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] active:translate-y-[1px]',
    outline:
      'border border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-border)] active:translate-y-[1px]',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-xl gap-1.5 min-h-[32px]',
    md: 'text-xs font-semibold px-4 py-2 rounded-xl gap-2 min-h-[38px]',
    lg: 'text-sm font-semibold px-5 py-2.5 rounded-xl gap-2.5 min-h-[44px]',
    icon: 'p-2 rounded-xl min-w-[38px] min-h-[38px]',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
