'use client';

import { useParams } from 'next/navigation';
import TaskList from '@/components/tasks/TaskList';

export default function TaskRoute() {
  const params = useParams<{ taskId: string }>();
  return <TaskList selectedTaskId={params.taskId} />;
}
