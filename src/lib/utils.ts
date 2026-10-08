import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Định dạng dung lượng byte thành B, KB, MB, GB dễ đọc
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Định dạng thời lượng video tính bằng giây thành mm:ss hoặc hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);

  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Định dạng ngày tương đối (Hôm nay, hôm qua, hoặc DD/MM/YYYY)
 */
export function formatDate(dateString?: string | null, referenceTime?: number): string {
  if (!dateString) return 'Chưa đặt';
  const date = new Date(dateString);
  const now = referenceTime ? new Date(referenceTime) : new Date('2026-10-08T12:00:00Z');
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Ngày mai';
  if (diffDays === -1) return 'Hôm qua';
  if (diffDays < -1) return `${Math.abs(diffDays)} ngày trước`;
  if (diffDays > 1 && diffDays <= 7) return `Còn ${diffDays} ngày`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Kiểm tra xem một deadline có bị quá hạn không
 */
export function isOverdue(dateString?: string | null, referenceTime?: number): boolean {
  if (!dateString) return false;
  const now = referenceTime ?? new Date('2026-10-08T12:00:00Z').getTime();
  return new Date(dateString).getTime() < now;
}
