import { Suspense } from 'react';
import TaskRoute from '@/components/tasks/TaskRoute';

export default function TaskDetailPage() {
  return (
    <Suspense fallback={null}>
      <TaskRoute />
    </Suspense>
  );
}
