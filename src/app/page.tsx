'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import TaskList from '@/components/tasks/TaskList';
import VideoGallery from '@/components/videos/VideoGallery';
import FileVault from '@/components/files/FileVault';
import MemberManagement from '@/components/members/MemberManagement';
import { ToastProvider } from '@/components/ui/Toast';
import {
  MOCK_CURRENT_USER,
} from '@/lib/mock-data';
import { Task, GameplayVideo, FileRecord, ProjectRole, ProjectMember, Profile } from '@/types/database';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [currentRole, setCurrentRole] = useState<ProjectRole>('OWNER');

  // Application state (Khởi tạo trạng thái trống theo yêu cầu của Shin)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [videos, setVideos] = useState<GameplayVideo[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [members, setMembers] = useState<(ProjectMember & { profile: Profile })[]>([
    {
      id: 'pm-1',
      project_id: 'proj-1',
      user_id: 'user-shin',
      role: 'OWNER',
      created_at: '2026-10-08T00:00:00Z',
      profile: MOCK_CURRENT_USER,
    },
  ]);

  // Selected item navigation states
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<GameplayVideo | null>(null);

  const currentProject = {
    id: 'proj-1',
    name: 'Game Team Project',
    description: 'Dự án mới sẵn sàng để bắt đầu',
    status: 'active',
    created_by: 'user-shin',
    created_at: '2026-10-08T00:00:00Z',
    updated_at: '2026-10-08T00:00:00Z',
  };
  const currentUserId = MOCK_CURRENT_USER.id;

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

  // Member actions
  const handleUpdateRole = (userId: string, newRole: ProjectRole) => {
    setMembers((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
    );
  };

  const handleRemoveMember = (userId: string) => {
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  };

  const handleAddMember = (displayName: string, role: ProjectRole) => {
    const newUid = `user-${crypto.randomUUID()}`;
    const newM: ProjectMember & { profile: Profile } = {
      id: `pm-${crypto.randomUUID()}`,
      project_id: currentProject.id,
      user_id: newUid,
      role,
      created_at: new Date().toISOString(),
      profile: {
        id: newUid,
        display_name: displayName,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
    setMembers((prev) => [...prev, newM]);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col selection:bg-indigo-500 selection:text-white">
        {/* Top Navbar */}
        <Navbar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setSelectedTaskId(null);
            setSelectedVideo(null);
          }}
          currentRole={currentRole}
          onRoleChange={(role) => setCurrentRole(role)}
          projectName={currentProject.name}
        />

        {/* Main Container: chừa khoảng đệm dưới cho Mobile Bottom Navigation */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
        {currentTab === 'dashboard' && (
          <DashboardOverview
            tasks={tasks}
            videos={videos}
            files={files}
            currentUserId={currentUserId}
            userRole={currentRole}
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
            members={members}
            currentUserId={currentUserId}
            userRole={currentRole}
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
            userRole={currentRole}
            currentUserId={currentUserId}
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
            userRole={currentRole}
            currentUserId={currentUserId}
            projectId={currentProject.id}
            onAddFile={handleAddFile}
            onDeleteFile={handleDeleteFile}
          />
        )}

        {currentTab === 'members' && (
          <MemberManagement
            members={members}
            userRole={currentRole}
            currentUserId={currentUserId}
            onUpdateRole={handleUpdateRole}
            onRemoveMember={handleRemoveMember}
            onAddMember={handleAddMember}
          />
        )}
      </main>
    </div>
  </ToastProvider>
  );
}
