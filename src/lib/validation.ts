import { ApiError } from '@/lib/api';
import { SLOT_USER_IDS, TASK_TAGS, type TaskTag } from '@/lib/constants';
import type { TaskPriority, TaskStatus } from '@/types/database';

export const TASK_STATUSES: readonly TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE',
  'BLOCKED',
];

export const TASK_PRIORITIES: readonly TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

const MEMBER_IDS = new Set<string>(Object.values(SLOT_USER_IDS));

export function parseTitle(value: unknown): string {
  if (typeof value !== 'string') throw new ApiError(400, 'invalid', 'title');
  const title = value.trim();
  if (!title || title.length > 200) throw new ApiError(400, 'invalid', 'title');
  return title;
}

export function parseDescription(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new ApiError(400, 'invalid', 'description');
  if (value.length > 10_000) throw new ApiError(400, 'invalid', 'description');
  return value;
}

export function parseCommentBody(value: unknown): string {
  if (typeof value !== 'string') throw new ApiError(400, 'invalid', 'body');
  const body = value.trim();
  if (!body || body.length > 5_000) throw new ApiError(400, 'invalid', 'body');
  return body;
}

export function parseStatus(value: unknown, fallback: TaskStatus): TaskStatus {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !TASK_STATUSES.includes(value as TaskStatus)) {
    throw new ApiError(400, 'invalid', 'status');
  }
  return value as TaskStatus;
}

export function parsePriority(value: unknown, fallback: TaskPriority): TaskPriority {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !TASK_PRIORITIES.includes(value as TaskPriority)) {
    throw new ApiError(400, 'invalid', 'priority');
  }
  return value as TaskPriority;
}

export function parseTag(value: unknown): TaskTag | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !(TASK_TAGS as readonly string[]).includes(value)) {
    throw new ApiError(400, 'invalid', 'tag');
  }
  return value as TaskTag;
}

/** assignee_id bắt buộc là uuid của một trong 4 slot đã seed, không nhận giá trị tuỳ ý. */
export function parseAssignee(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !MEMBER_IDS.has(value)) {
    throw new ApiError(400, 'invalid', 'assignee_id');
  }
  return value;
}

export function parseDeadline(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ApiError(400, 'invalid', 'deadline');
  const time = Date.parse(value);
  if (Number.isNaN(time)) throw new ApiError(400, 'invalid', 'deadline');
  return new Date(time).toISOString();
}

export function parseProgress(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiError(400, 'invalid', 'progress');
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export interface ChecklistDraft {
  label: string;
  done: boolean;
}

export function parseChecklist(value: unknown): ChecklistDraft[] {
  if (!Array.isArray(value)) throw new ApiError(400, 'invalid', 'checklist');
  if (value.length > 100) throw new ApiError(400, 'invalid', 'checklist');

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new ApiError(400, 'invalid', `checklist[${index}]`);
    const item = entry as { label?: unknown; done?: unknown };
    if (typeof item.label !== 'string') throw new ApiError(400, 'invalid', `checklist[${index}].label`);
    const label = item.label.trim();
    if (!label || label.length > 300) throw new ApiError(400, 'invalid', `checklist[${index}].label`);
    return { label, done: item.done === true };
  });
}
