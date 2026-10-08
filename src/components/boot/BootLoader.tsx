'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Gamepad2, Loader2 } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';

interface BootLoaderProps {
  /** true khi /api/bootstrap đã settle (thành công hoặc thất bại) */
  bootDone: boolean;
  onComplete: () => void;
  minDurationMs?: number;
}

/**
 * Không dùng requestAnimationFrame: rAF bị trình duyệt dừng khi tab ẩn,
 * khiến progress kẹt ở 0% vĩnh viễn. Đồng hồ ở đây chạy bằng setInterval
 * trên mốc thời gian tuyệt đối nên vẫn tới đích dù tab không hiển thị.
 */
export default function BootLoader({ bootDone, onComplete, minDurationMs = 1600 }: BootLoaderProps) {
  const { t, formatNumber } = useLocale();
  const [elapsed, setElapsed] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(timer);
  }, []);

  const finished = bootDone && elapsed >= minDurationMs;

  useEffect(() => {
    if (finished && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [finished, onComplete]);

  const progress = finished
    ? 100
    : Math.min(95, Math.round((Math.min(elapsed, minDurationMs) / minDurationMs) * 95));

  const statusMessage =
    progress < 30
      ? t('boot.loading.init')
      : progress < 60
        ? t('boot.loading.connect')
        : progress < 85
          ? t('boot.loading.tasks')
          : t('boot.loading.ready');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)] p-4 sm:p-6"
      role="region"
      aria-label={t('nav.brand')}
    >
      <div className="flex w-full max-w-md animate-in fade-in flex-col items-center gap-7 duration-200">
        <div className="space-y-3 text-center">
          <div
            className="inline-flex size-14 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white motion-safe:animate-pulse"
            aria-hidden="true"
          >
            <Gamepad2 className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">
              {t('nav.brand')}
            </h1>
            <span className="mt-1 inline-block rounded bg-[var(--color-brand-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-brand-hover)]">
              {t('nav.version')}
            </span>
          </div>
        </div>

        <div className="w-full space-y-2.5">
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${statusMessage} (${formatNumber(progress)}%)`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-raised)]"
          >
            <div
              className="h-full rounded-full bg-[var(--color-brand)] ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%`, transition: 'width 100ms linear' }}
            />
          </div>

          <div className="flex items-center justify-between px-0.5 text-xs text-[var(--color-text-muted)]">
            <div className="flex min-w-0 items-center gap-1.5 font-medium" aria-live="polite">
              {progress < 100 && (
                <Loader2
                  className="size-3.5 shrink-0 animate-spin text-[var(--color-brand)]"
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{statusMessage}</span>
            </div>
            <span className="shrink-0 font-mono font-semibold text-[var(--color-text)]">
              {formatNumber(progress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
