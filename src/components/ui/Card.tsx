'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'raised' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-[var(--color-surface)] border-[var(--color-border)] shadow-sm',
    raised: 'bg-[var(--color-surface-raised)] border-[var(--color-border)] shadow-md',
    interactive:
      'bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)] transition-all duration-150 cursor-pointer shadow-sm',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={`rounded-2xl border ${variants[variant]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
