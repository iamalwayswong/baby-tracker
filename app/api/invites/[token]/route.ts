import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireUser, json, error } from "@/lib/api";

// GET /api/invites/:token — preview an invite (who/what child) before accepting
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const invite = await queryOne<{ status: string; expires_at: string; child_name: string; inviter: string }>(
    `select i.status, i.expires_at, c.name as child_name, u.name as inviter
       from invites i join children c on c.id = i.child_id
       join users u on u.id = i.invited_by
      where i.token = $1`,
    [params.token]
  );
  if (!invite) return error("Invite not found", 404);
  const valid = invite.status === "pending" && new Date(invite.expires_at) > new Date();
  return json({ childName: invite.child_name, inviter: invite.inviter, valid, status: invite.status });
}

// POST /api/invites/:token — accept the invite (must be logged in)
export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const invite = await queryOne<{ id: string; child_id: string; status: string; expires_at: string }>(
    "select id, child_id, status, expires_at from invites where token = $1",
    [params.token]
  );
  if (!invite) return error("Invite not found", 404);
  if (invite.status !== "pending" || new Date(invite.expires_at) <= new Date()) {
    return error("This invite is no longer valid", 410);
  }

  await query(
    `insert into caregivers (child_id, user_id, role) values ($1, $2, 'caregiver')
     on conflict (child_id, user_id) do nothing`,
    [invite.child_id, user.id]
  );
  await query("update invites set status = 'accepted' where id = $1", [invite.id]);
  return json({ childId: invite.child_id });
}
