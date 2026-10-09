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
  IN_PROGRESS: { color: 'bg-[var(--color-brand-soft)] text-[var(--color-brand)] border-[var(--color-brand)]/30' },
  REVIEW: { color: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/30' },
  DONE: { color: 'bg-[var(--color-success-soft)] text-[var(--color-success-text)] border-[var(--color-success)]/40' },
  BLOCKED: { color: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger)]/30' },
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
  code: 'bg-[#E9F2FF] text-[#0055CC] border-[#1868DB]/30 dark:bg-[#132a48] dark:text-[#58a6ff] dark:border-[#388bfd]/30',
  art: 'bg-[#EAE6FF] text-[#5E4DB2] border-[#5E4DB2]/30 dark:bg-[#271d47] dark:text-[#bc8cff] dark:border-[#a371f7]/30',
  design: 'bg-[#E6FCFF] text-[#008DA6] border-[#008DA6]/30 dark:bg-[#0c313a] dark:text-[#39c5cf] dark:border-[#39c5cf]/30',
  audio: 'bg-[#F3FAE7] text-[#3F6B12] border-[#94C748]/50 dark:bg-[#1a2d14] dark:text-[#7ee787] dark:border-[#56d364]/40',
  qa: 'bg-[#FFF0B3] text-[#974F0C] border-[#974F0C]/30 dark:bg-[#322309] dark:text-[#e3b341] dark:border-[#d29922]/30',
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
