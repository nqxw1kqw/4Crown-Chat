'use client';

import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-800/60 ${className}`}
      aria-hidden="true"
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Đang tải dữ liệu tổng quan...">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-800 bg-[#12141d] p-5 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-[#12141d] p-5 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-[#12141d] p-5 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Đang tải danh sách công việc...">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-zinc-800 bg-[#12141d] p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function VideoGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse" aria-label="Đang tải danh sách video...">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-2xl border border-zinc-800 bg-[#12141d] overflow-hidden space-y-3 p-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FileVaultSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Đang tải danh sách tập tin...">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-800 bg-[#12141d] p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-[#12141d] p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800/40">
            <div className="flex items-center gap-3 w-1/2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

