'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FieldShellProps {
  label?: string;
  error?: string;
  helperText?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

function FieldShell({ label, error, helperText, htmlFor, className, children }: FieldShellProps) {
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-xs font-medium text-[var(--color-text)]">
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-[var(--color-danger)]">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-[var(--color-text-muted)]">{helperText}</p>
      ) : null}
    </div>
  );
}

type InputLike = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helperText?: string;
};

export function FieldInput({ label, error, helperText, className, id, ...props }: InputLike) {
  const inputId = id ?? (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <FieldShell label={label} error={error} helperText={helperText} htmlFor={inputId}>
      <Input
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn('h-9 text-xs', error && 'border-[var(--color-danger)]', className)}
        {...props}
      />
    </FieldShell>
  );
}

type TextareaLike = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  helperText?: string;
};

export function FieldTextarea({ label, error, helperText, className, id, ...props }: TextareaLike) {
  const inputId = id ?? (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <FieldShell label={label} error={error} helperText={helperText} htmlFor={inputId}>
      <Textarea
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn('text-xs', className)}
        {...props}
      />
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

type SelectLike = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
};

export function FieldSelect({
  label,
  error,
  helperText,
  options,
  className,
  id,
  children,
  ...props
}: SelectLike) {
  const inputId = id ?? (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <FieldShell label={label} error={error} helperText={helperText} htmlFor={inputId}>
      <div className="relative">
        <select
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            'h-9 w-full cursor-pointer appearance-none rounded-md border border-input bg-background px-3 pr-8 text-xs text-foreground shadow-xs transition-[color,box-shadow] outline-none',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'disabled:pointer-events-none disabled:opacity-50',
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
      </div>
    </FieldShell>
  );
}

/** Select gọn cho thanh công cụ (không label, không khung ngoài). */
export function ToolbarSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-8 cursor-pointer appearance-none rounded-md border border-input bg-background pl-2.5 pr-7 text-xs font-medium text-foreground outline-none transition-[color,box-shadow] hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
    </div>
  );
}
