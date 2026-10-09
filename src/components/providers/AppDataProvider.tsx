'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ApiClientError,
  apiDelete,
  apiFetch,
  apiPatch,
  apiPost,
  apiPut,
  isStaleError,
  type ApiErrorCode,
} from '@/lib/api-client';
import type { SlotId } from '@/lib/constants';
import { permissionsFor, READ_ONLY, type Permissions } from '@/lib/permissions';
import type {
  BootstrapPayload,
  FileRecord,
  GameplayVideo,
  Project,
  ProjectRole,
  Task,
  TaskChecklistItem,
  TaskComment,
  TeamMember,
} from '@/types/database';

export type AppPhase = 'booting' | 'identity' | 'ready' | 'error';

export interface SessionInfo {
  slot: SlotId;
  userId: string;
  role: ProjectRole;
}

export interface TaskDraft {
  title: string;
  description?: string | null;
  status?: Task['status'];
  priority?: Task['priority'];
  tag?: Task['tag'];
  assignee_id?: string | null;
  deadline?: string | null;
}

export interface TeamPatch {
  roles?: Partial<Record<SlotId, ProjectRole>>;
  add?: Partial<Record<SlotId, ProjectRole>>;
  remove?: SlotId[];
}

interface AppDataValue {
  phase: AppPhase;
  bootDone: boolean;
  errorCode: ApiErrorCode | null;
  session: SessionInfo | null;
  myRole: ProjectRole | null;
  can: Permissions;
  project: Project | null;
  members: TeamMember[];
  tasks: Task[];
  videos: GameplayVideo[];
  files: FileRecord[];

  memberName: (userId?: string | null) => string | null;
  retry: () => void;
  login: (slot: SlotId, passcode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;

  createTask: (draft: TaskDraft) => Promise<Task>;
  updateTask: (taskId: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  saveChecklist: (taskId: string, items: { label: string; done: boolean }[]) => Promise<void>;
  addComment: (taskId: string, body: string) => Promise<TaskComment>;
  deleteComment: (taskId: string, commentId: string) => Promise<void>;

  deleteVideo: (videoId: string) => Promise<void>;
  linkVideoToTask: (videoId: string, taskId: string | null) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  linkFileToTask: (fileId: string, taskId: string | null) => Promise<void>;

  renameMembers: (names: Partial<Record<SlotId, string>>) => Promise<void>;
  updateTeam: (patch: TeamPatch) => Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<AppPhase>('booting');
  const [bootDone, setBootDone] = useState(false);
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [videos, setVideos] = useState<GameplayVideo[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [bootToken, setBootToken] = useState(0);

  const applyBootstrap = useCallback((payload: BootstrapPayload) => {
    setProject(payload.project);
    setMembers(payload.members);
    setTasks(payload.tasks);
    setVideos(payload.videos);
    setFiles(payload.files);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let current: SessionInfo | null = null;
        try {
          current = await apiFetch<SessionInfo>('/api/auth/session');
        } catch (err) {
          if (err instanceof ApiClientError && err.status === 401) current = null;
          else throw err;
        }

        if (!current) {
          if (cancelled) return;
          setSession(null);
          setPhase('identity');
          return;
        }

        const payload = await apiFetch<BootstrapPayload>('/api/bootstrap');
        if (cancelled) return;
        setSession(current);
        applyBootstrap(payload);
        setPhase('ready');
      } catch (err) {
        if (cancelled) return;
        setErrorCode(err instanceof ApiClientError ? err.code : 'system');
        setPhase('error');
      } finally {
        if (!cancelled) setBootDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyBootstrap, bootToken]);

  const login = useCallback(
    async (slot: SlotId, passcode?: string) => {
      const next = await apiPost<SessionInfo>('/api/auth/login', { slot, passcode });
      const payload = await apiFetch<BootstrapPayload>('/api/bootstrap');
      setSession(next);
      applyBootstrap(payload);
      setErrorCode(null);
      setPhase('ready');
    },
    [applyBootstrap]
  );

  const logout = useCallback(async () => {
    await apiPost('/api/auth/logout', {}).catch(() => undefined);
    setSession(null);
    setProject(null);
    setMembers([]);
    setTasks([]);
    setVideos([]);
    setFiles([]);
    setPhase('identity');
  }, []);

  const refresh = useCallback(async () => {
    const payload = await apiFetch<BootstrapPayload>('/api/bootstrap');
    applyBootstrap(payload);
  }, [applyBootstrap]);

  // Vai trò lấy từ danh sách thành viên (mới nhất từ DB), cookie chỉ là ảnh chụp lúc login.
  const myRole = useMemo(() => {
    if (!session) return null;
    return members.find((m) => m.slot === session.slot)?.role ?? session.role;
  }, [members, session]);

  const can = useMemo<Permissions>(() => {
    if (!session || !myRole) return READ_ONLY;
    return permissionsFor(myRole, session.userId);
  }, [myRole, session]);

  const memberName = useCallback(
    (userId?: string | null): string | null => {
      if (!userId) return null;
      return members.find((m) => m.id === userId)?.display_name ?? null;
    },
    [members]
  );

  const createTask = useCallback(async (draft: TaskDraft) => {
    const { task } = await apiPost<{ task: Task }>('/api/tasks', draft);
    setTasks((prev) => [{ ...task, comment_count: 0, attachment_count: 0 }, ...prev]);
    return task;
  }, []);

  const updateTask = useCallback(async (taskId: string, patch: Partial<Task>) => {
    let snapshot: Task[] = [];
    setTasks((prev) => {
      snapshot = prev;
      return prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
    });
    try {
      const { task } = await apiPatch<{ task: Task }>(`/api/tasks/${taskId}`, patch);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, ...task, checklist: task.checklist ?? t.checklist } : t
        )
      );
    } catch (err) {
      if (isStaleError(err)) {
        // Task đã bị người khác xoá: bỏ khỏi danh sách rồi lấy lại trạng thái thật.
        setTasks(snapshot.filter((t) => t.id !== taskId));
        void refresh().catch(() => undefined);
      } else {
        setTasks(snapshot);
      }
      throw err;
    }
  }, [refresh]);

  const deleteTask = useCallback(async (taskId: string) => {
    await apiDelete(`/api/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setFiles((prev) => prev.map((f) => (f.linked_task_id === taskId ? { ...f, linked_task_id: null } : f)));
    setVideos((prev) => prev.map((v) => (v.linked_task_id === taskId ? { ...v, linked_task_id: null } : v)));
  }, []);

  const saveChecklist = useCallback(
    async (taskId: string, items: { label: string; done: boolean }[]) => {
      const res = await apiPut<{ task: Task; checklist: TaskChecklistItem[] }>(
        `/api/tasks/${taskId}/checklist`,
        { checklist: items }
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, checklist: res.checklist, progress: res.task.progress } : t
        )
      );
    },
    []
  );

  const addComment = useCallback(async (taskId: string, body: string) => {
    const { comment } = await apiPost<{ comment: TaskComment }>(`/api/tasks/${taskId}/comments`, { body });
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, comment_count: (t.comment_count ?? 0) + 1 } : t))
    );
    return comment;
  }, []);

  const deleteComment = useCallback(async (taskId: string, commentId: string) => {
    await apiDelete(`/api/tasks/${taskId}/comments/${commentId}`);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, comment_count: Math.max(0, (t.comment_count ?? 1) - 1) } : t
      )
    );
  }, []);

  const deleteVideo = useCallback(async (videoId: string) => {
    await apiDelete(`/api/videos/${videoId}`);
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  }, []);

  const linkVideoToTask = useCallback(async (videoId: string, taskId: string | null) => {
    const { video } = await apiPatch<{ video: GameplayVideo }>(`/api/videos/${videoId}`, {
      linked_task_id: taskId,
    });
    setVideos((prev) => prev.map((v) => (v.id === videoId ? video : v)));
  }, []);

  const deleteFile = useCallback(async (fileId: string) => {
    await apiDelete(`/api/files/${fileId}`);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const linkFileToTask = useCallback(async (fileId: string, taskId: string | null) => {
    const { file } = await apiPatch<{ file: FileRecord }>(`/api/files/${fileId}`, {
      linked_task_id: taskId,
    });
    setFiles((prev) => prev.map((f) => (f.id === fileId ? file : f)));
  }, []);

  const renameMembers = useCallback(async (names: Partial<Record<SlotId, string>>) => {
    const res = await apiPatch<{ members: TeamMember[] }>('/api/team', { names });
    setMembers(res.members);
  }, []);

  const updateTeam = useCallback(async (patch: TeamPatch) => {
    const res = await apiPatch<{ members: TeamMember[] }>('/api/team', patch);
    setMembers(res.members);
  }, []);

  const value = useMemo<AppDataValue>(
    () => ({
      phase,
      bootDone,
      errorCode,
      session,
      myRole,
      can,
      project,
      members,
      tasks,
      videos,
      files,
      memberName,
      retry: () => {
        setBootDone(false);
        setErrorCode(null);
        setBootToken((token) => token + 1);
      },
      login,
      logout,
      refresh,
      createTask,
      updateTask,
      deleteTask,
      saveChecklist,
      addComment,
      deleteComment,
      deleteVideo,
      linkVideoToTask,
      deleteFile,
      linkFileToTask,
      renameMembers,
      updateTeam,
    }),
    [
      phase,
      bootDone,
      errorCode,
      session,
      myRole,
      can,
      project,
      members,
      tasks,
      videos,
      files,
      memberName,
      login,
      logout,
      refresh,
      createTask,
      updateTask,
      deleteTask,
      saveChecklist,
      addComment,
      deleteComment,
      deleteVideo,
      linkVideoToTask,
      deleteFile,
      linkFileToTask,
      renameMembers,
      updateTeam,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used within AppDataProvider');
  return context;
}
