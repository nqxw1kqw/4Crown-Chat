import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { PROJECT_ID } from '@/lib/constants';
import { listR2Objects } from '@/lib/r2/client';

let pending: Promise<void> | null = null;
let lastSync = 0;

async function syncObjects() {
  const client = createAdminClient();
  const [files, videos, uploads] = await Promise.all([
    client.from('files').select('file_key').eq('project_id', PROJECT_ID),
    client.from('gameplay_videos').select('file_key').eq('project_id', PROJECT_ID),
    client.from('uploads').select('key').eq('project_id', PROJECT_ID),
  ]);
  if (files.error || videos.error || uploads.error) throw new Error('Cannot read R2 sync records');
  // Uploads with tracked lifecycle must finish through /uploads/complete.
  const known = new Set([
    ...(files.data ?? []).map((row) => row.file_key),
    ...(videos.data ?? []).map((row) => row.file_key),
    ...(uploads.data ?? []).map((row) => row.key),
  ]);
  const objects = await listR2Objects(`projects/${PROJECT_ID}/`);
  for (const object of objects) {
    const key = object.Key;
    if (!key || key.endsWith('/') || key.includes('/thumbnails/') || known.has(key)) continue;
    const name = key.split('/').at(-1)!;
    const isVideo = /\.(mp4|mov|mkv|webm)$/i.test(name);
    const hash = createHash('sha256').update(key).digest('hex');
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const record: Record<string, unknown> = {
      id, project_id: PROJECT_ID, file_key: key, size: object.Size ?? 0,
      uploaded_by: null,
      created_at: object.LastModified?.toISOString() ?? new Date().toISOString(),
      ...(isVideo ? { title: name.replace(/\.[^.]+$/, ''), version: '1.0', duration: 0, thumbnail_key: null }
        : { linked_task_id: null, name, folder: /\.(zip|rar|7z|apk|exe)$/i.test(name) ? 'builds' : /\.(wav|mp3|ogg|flac)$/i.test(name) ? 'audio' : /\.(png|jpe?g|webp|gif|psd|fbx|blend)$/i.test(name) ? 'assets' : 'general', mime: 'application/octet-stream' }),
    };
    const { error } = await client.from(isVideo ? 'gameplay_videos' : 'files').upsert(record, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  }
  lastSync = Date.now();
}

export async function syncR2Objects(): Promise<void> {
  if (Date.now() - lastSync < 60_000) return;
  pending ??= syncObjects().catch((error) => {
    console.warn('R2 sync failed; using saved records', error);
  }).finally(() => { pending = null; });
  await pending;
}
