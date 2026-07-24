import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser, json, error } from "@/lib/api";
import { caregiverRole } from "@/lib/auth";

// DELETE /api/children/:id/invite/:inviteId — owner revokes a pending invite.
// Sets status='revoked' so the link can no longer be accepted (accept requires
// status='pending'); the row is kept for record-keeping.
export async function DELETE(_req: Request, { params }: { params: { id: string; inviteId: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if ((await caregiverRole(user.id, params.id)) !== "owner") return error("Only the owner can revoke invites", 403);

  const rows = await query<{ id: string }>(
    `update invites set status = 'revoked'
      where id = $1 and child_id = $2 and status = 'pending'
      returning id`,
    [params.inviteId, params.id]
  );
  if (!rows.length) return error("Invite not found", 404);
  return json({ ok: true });
}
