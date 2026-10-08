'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Loader2 } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';

interface BootLoaderProps {
  onComplete: () => void;
  durationMs?: number;
}

export default function BootLoader({
  onComplete,
  durationMs = 2500,
}: BootLoaderProps) {
  const { t, formatNumber } = useLocale();
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    const startTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const rawPct = Math.min(100, (elapsed / durationMs) * 100);

      // Tăng tốc tự nhiên: hơi nhanh lúc đầu, chậm lại giữa, rồi nhanh về đích
      let easedPct = rawPct;
      if (rawPct < 40) {
        easedPct = rawPct * 1.1;
      } else if (rawPct < 80) {
        easedPct = 44 + (rawPct - 40) * 0.9;
      } else {
        easedPct = 80 + (rawPct - 80) * 1.0;
      }
      easedPct = Math.min(100, Math.round(easedPct));

      setProgress(easedPct);

      if (rawPct < 100) {
        animId = requestAnimationFrame(tick);
      } else {
        if (!completedRef.current) {
          completedRef.current = true;
          // Giữ thêm 200ms khi đạt 100% rồi chuyển tiếp
          setTimeout(() => {
            onComplete();
          }, 200);
        }
      }
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [durationMs, onComplete]);

  // Xác định dòng trạng thái theo từng mốc tiến trình
  const getStatusText = (pct: number) => {
    if (pct < 30) {
      return t('boot.loading.init');
    }
    if (pct < 60) {
      return t('boot.loading.connect');
    }
    if (pct < 85) {
      return t('boot.loading.tasks');
    }
    return t('boot.loading.ready');
  };

  const statusMessage = getStatusText(progress);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[var(--color-bg)] transition-opacity duration-200"
      role="region"
      aria-label={t('nav.brand')}
    >
      <div className="w-full max-w-md flex flex-col items-center text-center space-y-7 animate-in fade-in duration-200">
        {/* Brand Logo & Icon */}
        <div className="space-y-3">
          <div
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xl shadow-indigo-500/25 motion-safe:animate-pulse"
            aria-hidden="true"
          >
            <Gamepad2 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight">
              {t('nav.brand')}
            </h1>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full space-y-3">
          {/* Bar */}
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${statusMessage} (${formatNumber(progress)}%)`}
            className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-full h-2.5 sm:h-3 overflow-hidden p-0.5 shadow-inner"
          >
            <div
              className="bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 h-full rounded-full transition-all ease-out motion-reduce:transition-none"
              style={{
                width: `${progress}%`,
                transitionDuration: '100ms',
              }}
            />
          </div>

          {/* Status Message and Percentage */}
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-1">
            <div
              className="flex items-center gap-1.5 font-medium truncate pr-2"
              aria-live="polite"
            >
              {progress < 100 && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">{statusMessage}</span>
            </div>
            <span className="font-mono font-bold text-[var(--color-text)] shrink-0">
              {formatNumber(progress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
