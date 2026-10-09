'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, MessageSquare, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import MemberAvatar from '@/components/common/member-avatar';
import type { SlotId } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface AppNotification {
  id: string;
  taskId: string;
  taskTitle: string;
  actorId: string;
  actorName: string;
  actorSlot: SlotId;
  action: 'commented' | 'status_changed' | 'assignee_changed' | 'updated';
  summary: string;
  isDirectTarget: boolean;
  createdAt: string;
}

const READ_STORAGE_KEY = '4crown_read_notifications';

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(ids).slice(-200)));
  } catch {
    // ignore
  }
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} ngày trước`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => (typeof window === 'undefined' ? new Set() : getReadIds()));
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      })
      .catch(() => undefined);
  }, []);

  // Polling every 12 seconds + on window focus
  useEffect(() => {
    const timer = setTimeout(fetchNotifications, 0);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, 12_000);

    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.has(n.id)).length;
  }, [notifications, readIds]);

  const markAllAsRead = () => {
    const next = new Set(readIds);
    for (const n of notifications) {
      next.add(n.id);
    }
    setReadIds(next);
    saveReadIds(next);
  };

  const handleItemClick = (notification: AppNotification) => {
    const next = new Set(readIds);
    next.add(notification.id);
    setReadIds(next);
    saveReadIds(next);
    setOpen(false);
    router.push(`/tasks/${notification.taskId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex size-8 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
          aria-label="Thông báo"
        >
          <Bell className="size-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors" />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50 duration-200">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 sm:w-96 p-0 shadow-2xl border-[var(--color-border)] bg-[var(--color-surface)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--color-text)]">Thông báo</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand)]">
                {unreadCount} mới
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-brand)] hover:underline cursor-pointer"
            >
              <CheckCheck className="size-3.5" />
              <span>Đã đọc tất cả</span>
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-[var(--color-border)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-[var(--color-text-muted)]">
              <Bell className="size-8 opacity-40 mb-2" />
              <p className="text-xs font-medium">Chưa có thông báo nào</p>
              <p className="text-[11px] opacity-75 mt-0.5">Khi có ai bình luận hoặc cập nhật task, thông báo sẽ hiện ở đây.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !readIds.has(n.id);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 text-left transition-colors cursor-pointer',
                    isUnread
                      ? 'bg-[var(--color-brand)]/5 hover:bg-[var(--color-brand)]/10'
                      : 'hover:bg-[var(--color-surface-raised)]/50'
                  )}
                >
                  <div className="relative shrink-0 mt-0.5">
                    <MemberAvatar slot={n.actorSlot} name={n.actorName} size="md" />
                    {n.action === 'commented' && (
                      <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[var(--color-info)] text-white shadow-xs">
                        <MessageSquare className="size-2.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-semibold text-[var(--color-text)] truncate">{n.actorName}</span>
                      <span className="shrink-0 text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-[var(--color-text)] line-clamp-1">
                      {n.action === 'commented' ? 'Đã bình luận trên ' : 'Đã cập nhật '}
                      <span className="text-[var(--color-brand)] underline-offset-2 hover:underline">
                        {n.taskTitle}
                      </span>
                    </p>

                    {n.summary && (
                      <p className="rounded bg-[var(--color-surface-raised)] px-2 py-1 text-[11px] text-[var(--color-text-muted)] line-clamp-2 italic">
                        {n.summary}
                      </p>
                    )}
                  </div>

                  {isUnread && (
                    <span className="size-2 shrink-0 rounded-full bg-[var(--color-brand)] self-center" aria-label="Chưa đọc" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
