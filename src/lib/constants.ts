// Giới hạn kích thước và phần mở rộng cho v0.1
export const UPLOAD_LIMITS = {
  // Video gameplay: tối đa 5GB (hỗ trợ file quay dài 60fps)
  video: {
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB in bytes
    allowedExtensions: ['.mp4', '.mov', '.mkv', '.webm'],
  },
  // Game build: tối đa 10GB (cho build Unity/Unreal zip)
  build: {
    maxSize: 10 * 1024 * 1024 * 1024, // 10GB in bytes
    allowedExtensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.apk', '.exe'],
  },
  // File tài liệu/asset: tối đa 2GB (PSD, FBX, Blender, audio, v.v.)
  file: {
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB in bytes
    allowedExtensions: [
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
      '.blend', '.fbx', '.obj', '.psd', '.ase', '.aseprite',
      '.wav', '.mp3', '.ogg', '.flac',
      '.pdf', '.txt', '.md', '.json', '.csv', '.zip'
    ],
  },
} as const;

// Kích thước chuẩn cho mỗi Part khi upload Multipart R2 (100 MB hoặc tối thiểu 5MB theo chuẩn S3)
export const DEFAULT_PART_SIZE = 100 * 1024 * 1024; // 100MB
export const MIN_PART_SIZE = 5 * 1024 * 1024; // 5MB

export const TASK_STATUS_CONFIG = {
  TODO: { color: 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border-strong)]' },
  IN_PROGRESS: { color: 'bg-[#1868DB]/10 text-[var(--color-info)] border-[#1868DB]/30' },
  REVIEW: { color: 'bg-[#FFF0B3] text-[var(--color-warning)] border-[#974F0C]/30' },
  DONE: { color: 'bg-[#94C748]/20 text-[var(--color-success-text)] border-[#94C748]/50' },
  BLOCKED: { color: 'bg-[#CA3521]/8 text-[var(--color-danger)] border-[#CA3521]/30' },
} as const;

export const TASK_PRIORITY_CONFIG = {
  LOW: { color: 'text-[var(--color-text-muted)]' },
  NORMAL: { color: 'text-[var(--color-info)]' },
  HIGH: { color: 'text-[var(--color-warning)]' },
  CRITICAL: { color: 'text-[var(--color-danger)] font-bold' },
} as const;

export const TASK_TAGS = ['code', 'art', 'design', 'audio', 'qa', 'other'] as const;
export type TaskTag = (typeof TASK_TAGS)[number];

export const TASK_TAG_COLORS: Record<TaskTag, string> = {
  code: 'bg-[#E9F2FF] text-[#0055CC] border-[#1868DB]/30',
  art: 'bg-[#EAE6FF] text-[#5E4DB2] border-[#5E4DB2]/30',
  design: 'bg-[#E6FCFF] text-[#008DA6] border-[#008DA6]/30',
  audio: 'bg-[#F3FAE7] text-[#3F6B12] border-[#94C748]/50',
  qa: 'bg-[#FFF0B3] text-[#974F0C] border-[#974F0C]/30',
  other: 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border-strong)]',
};

// ---------------------------------------------------------------------------
// Danh tính team: 4 slot cố định, mỗi slot map sang một profiles.id (uuid) trong DB.
// Các uuid này được seed bởi migration 20261009000000_team_slots_and_collab.sql.
// ---------------------------------------------------------------------------
export type SlotId = 'm1' | 'm2' | 'm3' | 'm4';

export const SLOT_IDS: readonly SlotId[] = ['m1', 'm2', 'm3', 'm4'] as const;

export function isSlotId(value: unknown): value is SlotId {
  return value === 'm1' || value === 'm2' || value === 'm3' || value === 'm4';
}

export const SLOT_USER_IDS: Record<SlotId, string> = {
  m1: '00000000-0000-4000-8000-000000000001',
  m2: '00000000-0000-4000-8000-000000000002',
  m3: '00000000-0000-4000-8000-000000000003',
  m4: '00000000-0000-4000-8000-000000000004',
};

export const PROJECT_ID = '00000000-0000-4000-8000-0000000000a1';

export const DEFAULT_SLOT_NAMES: Record<SlotId, string> = {
  m1: 'カツラギ',
  m2: 'Thu Thao',
  m3: 'Anh Tuyet',
  m4: '多賀',
};
