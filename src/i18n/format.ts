import { Locale } from './config';
import { vi } from './dictionaries/vi';
import { ja } from './dictionaries/ja';

const DICTIONARIES = { vi, ja };

/**
 * Định dạng ngày theo ngôn ngữ đã chọn và trạng thái tương đối
 */
export function formatDate(
  dateString?: string | null,
  locale: Locale = 'vi',
  referenceTime?: number
): string {
  const dict = DICTIONARIES[locale] || vi;
  if (!dateString) return dict['common.unset'];

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dict['common.unset'];

  const now = referenceTime
    ? new Date(referenceTime)
    : typeof window !== 'undefined'
    ? new Date()
    : new Date('2026-10-09T00:00:00Z');

  // Kiểm tra cùng ngày dương lịch
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) return dict['common.today'];

  // So sánh khoảng cách số ngày theo đầu ngày (start of day)
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfDate - startOfNow) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return dict['common.today'];
  if (diffDays === 1) return dict['common.tomorrow'];
  if (diffDays === -1) return dict['common.yesterday'];

  if (diffDays < -1) {
    const template = dict['common.daysAgo'];
    return template.replace('{days}', String(Math.abs(diffDays)));
  }

  if (diffDays > 1 && diffDays <= 7) {
    const template = dict['common.daysLeft'];
    return template.replace('{days}', String(diffDays));
  }

  // Định dạng ngày chuẩn bằng Intl
  const intlLocale = locale === 'ja' ? 'ja-JP' : 'vi-VN';
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Định dạng số theo chuẩn locale
 */
export function formatNumber(value: number, locale: Locale = 'vi'): string {
  const intlLocale = locale === 'ja' ? 'ja-JP' : 'vi-VN';
  return new Intl.NumberFormat(intlLocale).format(value);
}

/**
 * Định dạng dung lượng byte thành B, KB, MB, GB, TB
 */
export function formatBytes(bytes: number, locale: Locale = 'vi', decimals = 1): string {
  void locale;
  if (bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

/**
 * Định dạng thời lượng video tính bằng giây thành mm:ss hoặc hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
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
 * Kiểm tra deadline có bị quá hạn không (tự động bỏ qua nếu status === 'DONE')
 */
export function isOverdue(
  dateString?: string | null,
  statusOrRefTime?: string | number,
  referenceTime?: number
): boolean {
  if (!dateString) return false;
  if (typeof statusOrRefTime === 'string' && statusOrRefTime === 'DONE') {
    return false;
  }
  const ref = typeof statusOrRefTime === 'number' ? statusOrRefTime : referenceTime;
  const now = ref ?? (typeof window !== 'undefined' ? Date.now() : new Date('2026-10-09T00:00:00Z').getTime());
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.getTime() < now;
}
