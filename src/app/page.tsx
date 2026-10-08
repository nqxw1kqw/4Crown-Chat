'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import TaskList from '@/components/tasks/TaskList';
import VideoGallery from '@/components/videos/VideoGallery';
import FileVault from '@/components/files/FileVault';
import LanguageGate from '@/components/boot/LanguageGate';
import BootLoader from '@/components/boot/BootLoader';
import IdentityModal from '@/components/profile/IdentityModal';
import ProfileModal from '@/components/profile/ProfileModal';
import { ToastProvider } from '@/components/ui/Toast';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { DEFAULT_PROJECT_ID } from '@/lib/constants';
import {
  LocalProfileState,
  useLocalProfile,
  useIsMounted,
  saveStoredProfile,
  resetStoredProfile,
} from '@/lib/profile';
import { Task, GameplayVideo, FileRecord } from '@/types/database';

type BootStep = 'language' | 'loading' | 'identity' | 'app';

const STORAGE_KEYS = {
  tasks: '4crown.tasks',
  videos: '4crown.videos',
  files: '4crown.files',
};

const SESSION_BOOT_KEY = '4crown.session_booted';

export default function Home() {
  const isMounted = useIsMounted();
  const profile = useLocalProfile();

  // Luồng khởi động: reload trang (F5) trong phiên giữ nguyên vào thẳng Dashboard/app.
  // Khi tắt hẳn tab/trình duyệt rồi vào lại thì sessionStorage mất -> chạy lại boot flow từ language.
  const [bootStep, setBootStep] = useState<BootStep>(() => {
    if (typeof window === 'undefined') return 'language';
    try {
      if (sessionStorage.getItem(SESSION_BOOT_KEY) === 'true') {
        return 'app';
      }
    } catch {}
    return 'language';
  });
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Reload page vẫn luôn hiện trang tổng quan (Dashboard)
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Application state (Tải từ localStorage và đồng bộ R2/DB)
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const savedTasks = localStorage.getItem(STORAGE_KEYS.tasks);
      return savedTasks ? JSON.parse(savedTasks) : [];
    } catch {
      return [];
    }
  });

  const [videos, setVideos] = useState<GameplayVideo[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const savedVideos = localStorage.getItem(STORAGE_KEYS.videos);
      return savedVideos ? JSON.parse(savedVideos) : [];
    } catch {
      return [];
    }
  });

  const [files, setFiles] = useState<FileRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const savedFiles = localStorage.getItem(STORAGE_KEYS.files);
      return savedFiles ? JSON.parse(savedFiles) : [];
    } catch {
      return [];
    }
  });

  // Selected item navigation states
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<GameplayVideo | null>(null);

  const currentProject = {
    id: DEFAULT_PROJECT_ID,
    name: '4Crow(n)-Chat',
  };

  // 1. Tự động đồng bộ và nạp lại toàn bộ dữ liệu từ R2 & DB
  useEffect(() => {

    const syncAll = async () => {
      try {
        const [resVideos, resFiles, resTasks] = await Promise.allSettled([
          fetch('/api/videos'),
          fetch('/api/files'),
          fetch('/api/tasks'),
        ]);

        if (resVideos.status === 'fulfilled' && resVideos.value.ok) {
          const vData = await resVideos.value.json();
          if (vData.videos) {
            setVideos(vData.videos);
            try {
              localStorage.setItem(STORAGE_KEYS.videos, JSON.stringify(vData.videos));
            } catch {}
          }
        }

        if (resFiles.status === 'fulfilled' && resFiles.value.ok) {
          const fData = await resFiles.value.json();
          if (fData.files) {
            setFiles(fData.files);
            try {
              localStorage.setItem(STORAGE_KEYS.files, JSON.stringify(fData.files));
            } catch {}
          }
        }

        if (resTasks.status === 'fulfilled' && resTasks.value.ok) {
          const tData = await resTasks.value.json();
          if (tData.tasks && tData.tasks.length > 0) {
            setTasks(tData.tasks);
            try {
              localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tData.tasks));
            } catch {}
          }
        }
      } catch (syncErr) {
        console.warn('Lỗi đồng bộ dữ liệu từ API:', syncErr);
      }
    };

    syncAll();
  }, []);

  // Task actions
  const handleUpdateTask = (taskId: string, updated: Partial<Task>) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId ? { ...t, ...updated, updated_at: new Date().toISOString() } : t
      );
      try {
        localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(next));
      } catch {}
      return next;
    });

    fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, ...updated }),
    }).catch(() => {});
  };

  const handleCreateTask = (newTaskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${crypto.randomUUID()}`,
      creator_id: newTaskData.creator_id || profile.currentSlotId || 'm1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks((prev) => {
      const next = [newTask, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(next));
      } catch {}
      return next;
    });

    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    }).catch(() => {});
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      try {
        localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(next));
      } catch {}
      return next;
    });

    fetch(`/api/tasks?id=${encodeURIComponent(taskId)}`, { method: 'DELETE' }).catch(() => {});
  };

  // Video actions
  const handleAddVideo = (newVid: GameplayVideo) => {
    setVideos((prev) => {
      const next = [newVid, ...prev.filter((v) => v.id !== newVid.id && v.file_key !== newVid.file_key)];
      try {
        localStorage.setItem(STORAGE_KEYS.videos, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleDeleteVideo = (videoId: string) => {
    const target = videos.find((v) => v.id === videoId);
    setVideos((prev) => {
      const next = prev.filter((v) => v.id !== videoId);
      try {
        localStorage.setItem(STORAGE_KEYS.videos, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (target) {
      fetch(
        `/api/videos?id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(target.file_key)}&thumbnailKey=${encodeURIComponent(target.thumbnail_key || '')}`,
        { method: 'DELETE' }
      ).catch(() => {});
    }
  };

  // File actions
  const handleAddFile = (newFile: FileRecord) => {
    setFiles((prev) => {
      const next = [newFile, ...prev.filter((f) => f.id !== newFile.id && f.file_key !== newFile.file_key)];
      try {
        localStorage.setItem(STORAGE_KEYS.files, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleDeleteFile = (fileId: string) => {
    const target = files.find((f) => f.id === fileId);
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== fileId);
      try {
        localStorage.setItem(STORAGE_KEYS.files, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (target) {
      fetch(`/api/files?id=${encodeURIComponent(fileId)}&key=${encodeURIComponent(target.file_key)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  };

  // Boot transitions
  const handleLanguageContinue = () => {
    setBootStep('loading');
  };

  const handleLoadingComplete = () => {
    if (!profile.currentSlotId) {
      setBootStep('identity');
    } else {
      setBootStep('app');
    }
  };

  useEffect(() => {
    if (bootStep === 'app') {
      try {
        sessionStorage.setItem(SESSION_BOOT_KEY, 'true');
      } catch {}
    }
  }, [bootStep]);

  const handleIdentityConfirm = (updated: LocalProfileState) => {
    saveStoredProfile(updated);
    try {
      sessionStorage.setItem(SESSION_BOOT_KEY, 'true');
    } catch {}
    setBootStep('app');
  };

  const handleUpdateProfile = (updated: LocalProfileState) => {
    saveStoredProfile(updated);
  };

  const handleResetIdentity = () => {
    try {
      sessionStorage.removeItem(SESSION_BOOT_KEY);
    } catch {}
    resetStoredProfile();
    setShowProfileModal(false);
    setBootStep('identity');
  };

  const currentSlotId = profile.currentSlotId;

  return (
    <LocaleProvider>
      <ToastProvider>
        <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col selection:bg-indigo-500 selection:text-white">
          {/* 1. Màn hình chọn ngôn ngữ */}
          {bootStep === 'language' && (
            <LanguageGate onContinue={handleLanguageContinue} />
          )}

          {/* 2. Màn hình loading giả siêu nhanh (0.5 giây) */}
          {bootStep === 'loading' && (
            <BootLoader onComplete={handleLoadingComplete} durationMs={500} />
          )}

          {/* 3. Màn hình chọn danh tính / vai trò */}
          {bootStep === 'identity' && (
            <IdentityModal
              isOpen={true}
              currentProfile={profile}
              onSelectIdentity={handleIdentityConfirm}
            />
          )}

          {/* 4. Ứng dụng chính (Chỉ render sau khi đã vào bước 'app') */}
          {bootStep === 'app' && (
            <>
              {/* Top Navbar */}
              <Navbar
                currentTab={currentTab}
                onTabChange={(tab) => {
                  setCurrentTab(tab);
                  setSelectedTaskId(null);
                  setSelectedVideo(null);
                }}
                projectName={currentProject.name}
                currentProfile={profile}
                onOpenProfile={() => setShowProfileModal(true)}
              />

              {/* Main Container: chừa khoảng đệm dưới cho Mobile Bottom Navigation */}
              <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
                {currentTab === 'dashboard' && (
                  <DashboardOverview
                    tasks={tasks}
                    videos={videos}
                    files={files}
                    currentUserId={currentSlotId || ''}
                    onSelectTask={(task) => {
                      setSelectedTaskId(task.id);
                      setCurrentTab('tasks');
                    }}
                    onSelectVideo={(video) => {
                      setSelectedVideo(video);
                      setCurrentTab('videos');
                    }}
                    onNavigateTab={(tab) => setCurrentTab(tab)}
                    profileNames={profile.names}
                  />
                )}

                {currentTab === 'tasks' && (
                  <TaskList
                    tasks={tasks}
                    profileNames={profile.names}
                    currentSlotId={currentSlotId}
                    onUpdateTask={handleUpdateTask}
                    onCreateTask={handleCreateTask}
                    onDeleteTask={handleDeleteTask}
                    selectedTaskId={selectedTaskId}
                    onClearSelectedTaskId={() => setSelectedTaskId(null)}
                  />
                )}

                {currentTab === 'videos' && (
                  <VideoGallery
                    videos={videos}
                    currentUserId={currentSlotId || 'm1'}
                    projectId={currentProject.id}
                    onAddVideo={handleAddVideo}
                    onDeleteVideo={handleDeleteVideo}
                    selectedVideo={selectedVideo}
                    onClearSelectedVideo={() => setSelectedVideo(null)}
                    profileNames={profile.names}
                  />
                )}

                {currentTab === 'files' && (
                  <FileVault
                    files={files}
                    tasks={tasks}
                    currentUserId={currentSlotId || 'm1'}
                    projectId={currentProject.id}
                    onAddFile={handleAddFile}
                    onDeleteFile={handleDeleteFile}
                    profileNames={profile.names}
                  />
                )}
              </main>

              {/* Profile Modal (Hồ sơ của tôi trên Navbar) */}
              {isMounted && (
                <ProfileModal
                  isOpen={showProfileModal}
                  onClose={() => setShowProfileModal(false)}
                  currentProfile={profile}
                  onUpdateProfile={handleUpdateProfile}
                  onResetIdentity={handleResetIdentity}
                />
              )}
            </>
          )}
        </div>
      </ToastProvider>
    </LocaleProvider>
  );
}
