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
    'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0f] disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20',
    secondary: 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white border border-zinc-700/60',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-600/20',
    ghost: 'text-zinc-400 hover:text-white hover:bg-zinc-800/80',
    outline: 'border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800/60',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5 min-h-[32px]',
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
