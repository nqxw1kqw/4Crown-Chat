import { createAvatar } from '@dicebear/core';
import { adventurer, croodles, funEmoji, micah } from '@dicebear/collection';
import type { SlotId } from '@/lib/constants';

// Ảnh đại diện riêng được gán cho các slot nhân vật:
// - m1: Katsuragi (Ảnh 2: Vương miện bóng đêm)
// - m2: Thu Thao (Ảnh 3: Thỏ vàng đeo kính cam)
// - m4: Taga (Ảnh 1: Bé mực Splatoon đội vòng hoa)
export const CUSTOM_AVATARS: Partial<Record<SlotId, string>> = {
  m1: '/avatars/m1.jpg?v=2',
  m2: '/avatars/m2.png?v=2',
  m4: '/avatars/m4.png?v=2',
};

// Mỗi slot một phong cách nhân vật hoạt hình làm fallback dự phòng.
const BUILDERS: Record<SlotId, (seed: string) => string> = {
  m1: (seed) => createAvatar(funEmoji, { seed, size: 96 }).toString(),
  m2: (seed) => createAvatar(adventurer, { seed, size: 96 }).toString(),
  m3: (seed) => createAvatar(croodles, { seed, size: 96 }).toString(),
  m4: (seed) => createAvatar(micah, { seed, size: 96 }).toString(),
};

/**
 * Lấy URL ảnh đại diện cho slot:
 * - Ưu tiên ảnh tùy chỉnh trong public/avatars/
 * - Fallback sang Dicebear SVG tạo nội bộ (như slot m3)
 */
export function memberAvatarUri(slot?: string | null): string {
  if (slot && slot in CUSTOM_AVATARS) {
    const custom = CUSTOM_AVATARS[slot as SlotId];
    if (custom) return custom;
  }
  const key = slot && slot in BUILDERS ? (slot as SlotId) : 'm1';
  const svg = BUILDERS[key](slot ?? 'unassigned');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
