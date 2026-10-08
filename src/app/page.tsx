'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import TaskList from '@/components/tasks/TaskList';
import VideoGallery from '@/components/videos/VideoGallery';
import FileVault from '@/components/files/FileVault';
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

export default function Home() {
  const isMounted = useIsMounted();
  const profile = useLocalProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [currentTab, setCurrentTab] = useState('dashboard');

  // Application state (Khởi tạo trạng thái trống theo yêu cầu của Shin)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [videos, setVideos] = useState<GameplayVideo[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);

  // Selected item navigation states
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<GameplayVideo | null>(null);

  const currentProject = {
    id: DEFAULT_PROJECT_ID,
    name: 'Game Team Project',
  };

  // Task actions
  const handleUpdateTask = (taskId: string, updated: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updated, updated_at: new Date().toISOString() } : t))
    );
  };

  const handleCreateTask = (newTaskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${crypto.randomUUID()}`,
      creator_id: newTaskData.creator_id || profile.currentSlotId || 'm1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Video actions
  const handleAddVideo = (newVid: GameplayVideo) => {
    setVideos((prev) => [newVid, ...prev]);
  };

  const handleDeleteVideo = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  };

  // File actions
  const handleAddFile = (newFile: FileRecord) => {
    setFiles((prev) => [newFile, ...prev]);
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleIdentityConfirm = (updated: LocalProfileState) => {
    saveStoredProfile(updated);
  };

  const handleUpdateProfile = (updated: LocalProfileState) => {
    saveStoredProfile(updated);
  };

  const handleResetIdentity = () => {
    resetStoredProfile();
    setShowProfileModal(false);
  };

  const currentSlotId = profile.currentSlotId;

  return (
    <LocaleProvider>
      <ToastProvider>
        <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col selection:bg-indigo-500 selection:text-white">
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
              />
            )}
          </main>

          {/* Identity Selection Modal (Bắt buộc chọn lần đầu khi chưa có slotId) */}
          {isMounted && (
            <IdentityModal
              isOpen={!profile.currentSlotId}
              currentProfile={profile}
              onSelectIdentity={handleIdentityConfirm}
            />
          )}

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
        </div>
      </ToastProvider>
    </LocaleProvider>
  );
}
