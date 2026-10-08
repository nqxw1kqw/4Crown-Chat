import type { TaskPriority, TaskStatus } from '@/types/database';

/** Bốn kiểu hiển thị công việc, đồng bộ qua query param ?view=. */
export const TASK_VIEWS = ['table', 'kanban', 'timeline', 'calendar'] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export function isTaskView(value: string | null | undefined): value is TaskView {
  return !!value && (TASK_VIEWS as readonly string[]).includes(value);
}

export const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'];

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

export type TaskSort = 'deadline' | 'priority' | 'updated';

/** deadline tăng dần (chưa đặt hạn xuống cuối), rồi đến ưu tiên. */
export function compareTasks(a: { deadline: string | null; priority: TaskPriority; updated_at: string; status: TaskStatus }, b: typeof a): number {
  if (a.status === 'DONE' && b.status !== 'DONE') return 1;
  if (b.status === 'DONE' && a.status !== 'DONE') return -1;

  const at = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
  const bt = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;

  const ap = PRIORITY_WEIGHT[a.priority] ?? 2;
  const bp = PRIORITY_WEIGHT[b.priority] ?? 2;
  if (ap !== bp) return ap - bp;

  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

export function startOfDay(value: string | number | Date): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dayDiff(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export const DAY_MS = 86_400_000;
