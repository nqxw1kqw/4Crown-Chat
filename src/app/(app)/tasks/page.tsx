import TaskList from '@/components/tasks/TaskList';
import { isTaskView } from '@/components/tasks/task-view-utils';

export const instant = false;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; new?: string }>;
}) {
  const params = await searchParams;
  return <TaskList initialView={isTaskView(params.view) ? params.view : undefined} openCreate={params.new === '1'} />;
}
