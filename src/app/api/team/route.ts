import { NextRequest, NextResponse } from 'next/server';
import { dbError, toErrorResponse, ApiError } from '@/lib/api';
import { requireContributor } from '@/lib/auth-helpers';
import { atLeast } from '@/lib/permissions';
import { db, listMembers } from '@/lib/data';
import { PROJECT_ID, SLOT_USER_IDS, isSlotId, type SlotId } from '@/lib/constants';
import type { ProjectRole } from '@/types/database';

const MAX_NAME_LENGTH = 40;
const ROLES: readonly ProjectRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

function requireRank(role: ProjectRole, minimum: ProjectRole): void {
  if (!atLeast(role, minimum)) throw new ApiError(403, 'forbidden');
}

function slotEntriesOf(value: unknown): [SlotId, string][] {
  if (!value || typeof value !== 'object') throw new ApiError(400, 'invalid');
  const out: [SlotId, string][] = [];
  for (const [slot, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isSlotId(slot) || typeof raw !== 'string') throw new ApiError(400, 'invalid', 'slot');
    out.push([slot, raw]);
  }
  return out;
}

/**
 * Không cho thao tác nào xoá OWNER cuối cùng: hết Chủ dự án thì không còn ai
 * đổi được vai trò, cả nhóm bị khoá ngoài.
 */
async function assertKeepsAnOwner(
  roleChanges: Map<SlotId, ProjectRole>,
  removedSlots: SlotId[]
): Promise<void> {
  const members = await listMembers();
  const survives = members.some((member) => {
    if (removedSlots.includes(member.slot)) return false;
    return (roleChanges.get(member.slot) ?? member.role) === 'OWNER';
  });
  if (!survives) throw new ApiError(400, 'invalid', 'can-demote-last-owner');
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError(400, 'invalid');

    const hasNames = body.names !== undefined;
    const hasRoles = body.roles !== undefined;
    const hasMembership = body.add !== undefined || body.remove !== undefined;
    if (!hasNames && !hasRoles && !hasMembership) throw new ApiError(400, 'invalid');

    const { session, role } = await requireContributor();
    const nameEntries = hasNames ? slotEntriesOf(body.names) : [];

    // Vai trò và danh sách thành viên: chỉ Chủ dự án. Đổi tên người khác: ADMIN+.
    // Ai cũng tự đổi được tên của slot mình (MEMBER trở lên).
    if (hasRoles || hasMembership) requireRank(role, 'OWNER');
    if (hasNames && nameEntries.some(([slot]) => slot !== session.slot)) requireRank(role, 'ADMIN');

    const client = db();

    if (hasNames) {
      for (const [slot, raw] of nameEntries) {
        const cleaned = raw.trim();
        if (!cleaned || cleaned.length > MAX_NAME_LENGTH) throw new ApiError(400, 'invalid', slot);
        const { error } = await client
          .from('profiles')
          .update({ display_name: cleaned, updated_at: new Date().toISOString() })
          .eq('id', SLOT_USER_IDS[slot]);
        if (error) throw dbError(error);
      }
    }

    const roleChanges = new Map<SlotId, ProjectRole>();
    if (hasRoles) {
      for (const [slot, raw] of slotEntriesOf(body.roles)) {
        if (!ROLES.includes(raw as ProjectRole)) throw new ApiError(400, 'invalid', 'role');
        // Chủ dự án không tự hạ vai trò của chính mình qua panel này.
        if (slot === session.slot) throw new ApiError(403, 'forbidden', 'cannot-change-own-role');
        roleChanges.set(slot, raw as ProjectRole);
      }
    }

    const removedSlots: SlotId[] = [];
    if (body.remove !== undefined) {
      if (!Array.isArray(body.remove)) throw new ApiError(400, 'invalid', 'remove');
      for (const slot of body.remove) {
        if (!isSlotId(slot)) throw new ApiError(400, 'invalid', 'slot');
        if (slot === session.slot) throw new ApiError(403, 'forbidden', 'cannot-remove-own-slot');
        removedSlots.push(slot);
      }
    }

    if (roleChanges.size > 0 || removedSlots.length > 0) {
      await assertKeepsAnOwner(roleChanges, removedSlots);
    }

    for (const [slot, role] of roleChanges) {
      const { error } = await client
        .from('project_members')
        .update({ role })
        .eq('project_id', PROJECT_ID)
        .eq('user_id', SLOT_USER_IDS[slot]);
      if (error) throw dbError(error);
    }

    for (const slot of removedSlots) {
      const { error } = await client
        .from('project_members')
        .delete()
        .eq('project_id', PROJECT_ID)
        .eq('user_id', SLOT_USER_IDS[slot]);
      if (error) throw dbError(error);
    }

    if (body.add !== undefined) {
      for (const [slot, raw] of slotEntriesOf(body.add)) {
        if (!ROLES.includes(raw as ProjectRole)) throw new ApiError(400, 'invalid', 'role');
        const { error } = await client
          .from('project_members')
          .upsert(
            { project_id: PROJECT_ID, user_id: SLOT_USER_IDS[slot], role: raw },
            { onConflict: 'project_id,user_id' }
          );
        if (error) throw dbError(error);
      }
    }

    return NextResponse.json({ members: await listMembers() });
  } catch (err) {
    return toErrorResponse(err);
  }
}
