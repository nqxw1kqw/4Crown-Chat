import { NextResponse } from 'next/server';
import { db } from '@/lib/data';

export async function GET() {
  const client = db();
  const checks: Record<string, { ok: boolean; error?: string }> = {};

  for (const table of ['task_comments', 'task_activity', 'notifications']) {
    const { error } = await client.from(table).select('id').limit(1);
    checks[table] = { ok: !error, error: error?.message };
  }

  return NextResponse.json(checks);
}
