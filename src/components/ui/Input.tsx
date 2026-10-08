'use client';

import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon: Icon, className = '', id, disabled, ...props }, ref) => {
    const generatedId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={generatedId}
            className="text-xs font-medium text-[var(--color-text)] flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3 pointer-events-none text-[var(--color-text-muted)]">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <input
            ref={ref}
            id={generatedId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${generatedId}-error` : helperText ? `${generatedId}-helper` : undefined}
            className={`w-full rounded-xl bg-[var(--color-surface)] border text-[var(--color-text)] text-xs placeholder:text-[var(--color-text-muted)] py-2.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
              Icon ? 'pl-9 pr-3.5' : 'px-3.5'
            } ${
              error
                ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                : 'border-[var(--color-border-strong)] hover:border-[var(--color-border)]'
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p id={`${generatedId}-error`} className="text-[11px] text-[var(--color-danger)] font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${generatedId}-helper`} className="text-[11px] text-[var(--color-text-muted)]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
