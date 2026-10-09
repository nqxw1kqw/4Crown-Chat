import { NextResponse } from 'next/server';
import { db, listTasks } from '@/lib/data';
import { PROJECT_ID } from '@/lib/constants';

export async function GET() {
  const client = db();
  const { data: allTasks, error } = await client.from('tasks').select('*');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return NextResponse.json({
    supabaseUrl,
    configuredProjectId: PROJECT_ID,
    allTasksCount: allTasks?.length ?? null,
    allTasksError: error?.message ?? null,
    tasks: allTasks,
  });
}
