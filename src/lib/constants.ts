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
  TODO: { label: 'Cần làm (TODO)', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-700/50' },
  IN_PROGRESS: { label: 'Đang làm (IN_PROGRESS)', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  REVIEW: { label: 'Đang duyệt (REVIEW)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  DONE: { label: 'Hoàn tất (DONE)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  BLOCKED: { label: 'Bị nghẽn (BLOCKED)', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
} as const;

export const TASK_PRIORITY_CONFIG = {
  LOW: { label: 'Thấp', color: 'text-zinc-400' },
  NORMAL: { label: 'Bình thường', color: 'text-blue-400' },
  HIGH: { label: 'Cao', color: 'text-amber-400' },
  CRITICAL: { label: 'Khẩn cấp', color: 'text-rose-500 font-bold' },
} as const;
