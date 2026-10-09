import { createAvatar } from '@dicebear/core';
import { adventurer, croodles, funEmoji, micah } from '@dicebear/collection';
import type { SlotId } from '@/lib/constants';

// Mỗi slot một phong cách nhân vật hoạt hình để team nhìn là nhận ra ngay.
// Kê khai từng style một: options của các style không trùng nhau nên không gộp vào mảng được.
const BUILDERS: Record<SlotId, (seed: string) => string> = {
  m1: (seed) => createAvatar(funEmoji, { seed, size: 96 }).toString(),
  m2: (seed) => createAvatar(adventurer, { seed, size: 96 }).toString(),
  m3: (seed) => createAvatar(croodles, { seed, size: 96 }).toString(),
  m4: (seed) => createAvatar(micah, { seed, size: 96 }).toString(),
};

/**
 * SVG dựng trong bundle (không gọi network), trả về data URI an toàn cho <img>.
 * Seed theo slot nên avatar đứng yên dù tên hiển thị có đổi.
 */
export function memberAvatarUri(slot?: string | null): string {
  const key = slot && slot in BUILDERS ? (slot as SlotId) : 'm1';
  const svg = BUILDERS[key](slot ?? 'unassigned');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
