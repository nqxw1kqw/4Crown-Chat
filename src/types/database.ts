import { SlotId, TaskTag } from '@/lib/constants';

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type UploadKind = 'video' | 'build' | 'file';
export type UploadStatus = 'pending' | 'completed' | 'aborted';

export type TaskActivityAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assignee_changed'
  | 'commented'
  | 'attached'
  | 'detached'
  | 'checklist';

export interface TeamMember {
  id: string;
  slot: SlotId;
  display_name: string;
  role: ProjectRole;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  label: string;
  done: boolean;
  position: number;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_id: string | null;
  action: TaskActivityAction;
  field: string | null;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  tag: TaskTag | null;
  assignee_id: string | null;
  creator_id: string | null;
  progress: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  checklist?: TaskChecklistItem[];
  comment_count?: number;
  attachment_count?: number;
}

export interface FileRecord {
  preview_url?: string | null;
  id: string;
  project_id: string;
  folder: string;
  name: string;
  file_key: string;
  size: number;
  mime: string | null;
  uploaded_by: string | null;
  linked_task_id: string | null;
  created_at: string;
}

export interface GameplayVideo {
  id: string;
  project_id: string;
  version: string;
  title: string;
  description: string | null;
  file_key: string;
  thumbnail_key: string | null;
  duration: number;
  size: number;
  uploaded_by: string | null;
  linked_task_id: string | null;
  created_at: string;
  /** URL đã ký, server sinh ra khi đọc — không phải cột trong DB. */
  thumbnail_url?: string | null;
}

export interface UploadRecord {
  id: string;
  project_id: string;
  user_id: string | null;
  kind: UploadKind;
  key: string;
  r2_upload_id: string;
  status: UploadStatus;
  size: number;
  created_at: string;
}

export interface BootstrapPayload {
  project: Project;
  members: TeamMember[];
  tasks: Task[];
  videos: GameplayVideo[];
  files: FileRecord[];
}
