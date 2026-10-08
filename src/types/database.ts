export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type UploadKind = 'video' | 'build' | 'file';
export type UploadStatus = 'pending' | 'completed' | 'aborted';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
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

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
  profile?: Profile;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  creator_id: string | null;
  progress: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
  creator?: Profile | null;
  checklist?: TaskChecklistItem[];
  files?: FileRecord[];
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  label: string;
  done: boolean;
  position: number;
  created_at: string;
}

export interface FileRecord {
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
  uploader?: Profile | null;
  preview_url?: string | null;
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
  created_at: string;
  uploader?: Profile | null;
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
