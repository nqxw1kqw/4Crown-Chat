import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { ProjectRole } from '@/types/database';
import { SlotId, isSlotId, SLOT_USER_IDS } from '@/lib/constants';

export const SESSION_COOKIE = 'gth_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const ROLES: readonly ProjectRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

export interface SessionPayload {
  slot: SlotId;
  userId: string;
  role: ProjectRole;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (secret && secret.length >= 32) {
    return secret;
  }
  return '4crown-chat-default-session-hmac-secret-key-32chars-min';
}

function sign(body: string): string {
  return createHmac('sha256', getSecret()).update(body).digest('base64url');
}

export function serializeSession(slot: SlotId, role: ProjectRole): string {
  const payload = {
    slot,
    userId: SLOT_USER_IDS[slot],
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body)}`;
}

export function parseSession(raw: string | undefined): SessionPayload | null {
  if (!raw) return null;

  const dot = raw.indexOf('.');
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);

  const expected = Buffer.from(sign(body), 'utf8');
  const actual = Buffer.from(mac, 'utf8');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!decoded || typeof decoded !== 'object') return null;
  const candidate = decoded as Record<string, unknown>;

  if (!isSlotId(candidate.slot)) return null;
  if (typeof candidate.exp !== 'number' || candidate.exp * 1000 <= Date.now()) return null;
  if (typeof candidate.role !== 'string' || !ROLES.includes(candidate.role as ProjectRole)) return null;

  const slot = candidate.slot;
  return {
    slot,
    userId: SLOT_USER_IDS[slot],
    role: candidate.role as ProjectRole,
    exp: candidate.exp,
  };
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return parseSession(store.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
} as const;
