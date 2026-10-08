import { useSyncExternalStore } from 'react';
import { ProjectRole } from '@/types/database';

export type SlotId = 'm1' | 'm2' | 'm3' | 'm4';

export const SLOT_IDS: readonly SlotId[] = ['m1', 'm2', 'm3', 'm4'] as const;

export const DEFAULT_SLOT_NAMES: Record<SlotId, string> = {
  m1: 'カツラギ',
  m2: 'Thu Thao',
  m3: 'Anh Tuyet',
  m4: '多賀',
};

export const PROFILE_STORAGE_KEY = 'gth.profile';

export interface LocalProfileState {
  currentSlotId: SlotId | null;
  role: ProjectRole;
  names: Record<SlotId, string>;
}

export function getDefaultProfile(): LocalProfileState {
  return {
    currentSlotId: null,
    role: 'ADMIN',
    names: { ...DEFAULT_SLOT_NAMES },
  };
}

export function isSlotId(id?: string | null): id is SlotId {
  return typeof id === 'string' && (id === 'm1' || id === 'm2' || id === 'm3' || id === 'm4');
}

/**
 * Đọc cấu hình danh tính cục bộ từ localStorage
 */
export function getStoredProfile(): LocalProfileState {
  if (typeof window === 'undefined') {
    return getDefaultProfile();
  }

  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return getDefaultProfile();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return getDefaultProfile();

    const role: ProjectRole = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(parsed.role)
      ? parsed.role
      : 'ADMIN';

    const currentSlotId: SlotId | null = isSlotId(parsed.currentSlotId)
      ? parsed.currentSlotId
      : null;

    const names: Record<SlotId, string> = {
      m1: typeof parsed.names?.m1 === 'string' && parsed.names.m1.trim() ? parsed.names.m1.trim() : DEFAULT_SLOT_NAMES.m1,
      m2: typeof parsed.names?.m2 === 'string' && parsed.names.m2.trim() ? parsed.names.m2.trim() : DEFAULT_SLOT_NAMES.m2,
      m3: typeof parsed.names?.m3 === 'string' && parsed.names.m3.trim() ? parsed.names.m3.trim() : DEFAULT_SLOT_NAMES.m3,
      m4: typeof parsed.names?.m4 === 'string' && parsed.names.m4.trim() ? parsed.names.m4.trim() : DEFAULT_SLOT_NAMES.m4,
    };

    return {
      currentSlotId,
      role,
      names,
    };
  } catch (err) {
    console.warn('Lỗi đọc gth.profile từ localStorage, trả về mặc định:', err);
    return getDefaultProfile();
  }
}

// Subscription store để phản ứng tức thì khi lưu hoặc reset profile
const listeners = new Set<() => void>();
let cachedRawProfile: string | null = null;
let cachedProfile: LocalProfileState = getDefaultProfile();

function notifyListeners() {
  listeners.forEach((callback) => callback());
}

function subscribeProfile(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === PROFILE_STORAGE_KEY || !e.key) {
      cachedRawProfile = null;
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function getClientProfileSnapshot(): LocalProfileState {
  if (typeof window === 'undefined') return getDefaultProfile();
  const currentRaw = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (currentRaw !== cachedRawProfile) {
    cachedRawProfile = currentRaw;
    cachedProfile = getStoredProfile();
  }
  return cachedProfile;
}

function getServerProfileSnapshot(): LocalProfileState {
  return getDefaultProfile();
}

/**
 * Hook đồng bộ danh tính cục bộ chuẩn React 18/19 không gây cascading render
 */
export function useLocalProfile(): LocalProfileState {
  return useSyncExternalStore(
    subscribeProfile,
    getClientProfileSnapshot,
    getServerProfileSnapshot
  );
}

/**
 * Hook kiểm tra đã mount trên client chuẩn SSR
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    (callback) => {
      // Đăng ký rỗng vì trạng thái client sau mount là không đổi
      return () => {
        void callback;
      };
    },
    () => true,
    () => false
  );
}

/**
 * Lưu cấu hình danh tính cục bộ vào localStorage
 */
export function saveStoredProfile(profile: LocalProfileState): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.stringify(profile);
    localStorage.setItem(PROFILE_STORAGE_KEY, raw);
    cachedRawProfile = raw;
    cachedProfile = profile;
    notifyListeners();
  } catch (err) {
    console.warn('Lỗi lưu gth.profile vào localStorage:', err);
  }
}

/**
 * Xóa cấu hình danh tính cục bộ (đặt lại ứng dụng)
 */
export function resetStoredProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    cachedRawProfile = null;
    cachedProfile = getDefaultProfile();
    notifyListeners();
  } catch (err) {
    console.warn('Lỗi xóa gth.profile khỏi localStorage:', err);
  }
}

/**
 * Lấy tên hiển thị theo slotId từ danh sách tên cục bộ
 */
export function getSlotDisplayName(
  slotId?: string | null,
  names?: Record<SlotId, string>,
  unknownLabel: string = 'Không xác định'
): string {
  if (!slotId) return unknownLabel;
  if (isSlotId(slotId)) {
    return names?.[slotId] || DEFAULT_SLOT_NAMES[slotId];
  }
  return unknownLabel;
}
