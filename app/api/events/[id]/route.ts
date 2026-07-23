import { z } from "zod";
import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireUser, json, error } from "@/lib/api";
import { caregiverRole } from "@/lib/auth";
import { broadcast } from "@/lib/realtime";

async function loadOwned(userId: string, eventId: string) {
  const ev = await queryOne<{ id: string; child_id: string }>(
    "select id, child_id from events where id = $1",
    [eventId]
  );
  if (!ev) return null;
  if (!(await caregiverRole(userId, ev.child_id))) return null;
  return ev;
}

const Body = z.object({
  start_time: z.string().optional(),
  end_time: z.string().nullable().optional(),
  data: z.record(z.string(), z.any()).optional(),
  note: z.string().nullable().optional(),
});

// PATCH /api/events/:id — edit an event (e.g. stop a running timer)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const ev = await loadOwned(user.id, params.id);
  if (!ev) return error("Not found", 404);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid update");
  const { start_time, end_time, data, note } = parsed.data;

  const rows = await query(
    `update events set
        start_time = coalesce($2, start_time),
        end_time   = case when $3::boolean then $4 else end_time end,
        data       = coalesce($5, data),
        note       = case when $6::boolean then $7 else note end,
        updated_by = $8,
        updated_at = now()
      where id = $1
      returning id, type, start_time, end_time, data, note, created_by`,
    [
      params.id,
      start_time ?? null,
      end_time !== undefined,
      end_time ?? null,
      data ? JSON.stringify(data) : null,
      note !== undefined,
      note ?? null,
      user.id,
    ]
  );
  broadcast(ev.child_id, { kind: "event.updated", event: rows[0] });
  return json({ event: rows[0] });
}

// DELETE /api/events/:id
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const ev = await loadOwned(user.id, params.id);
  if (!ev) return error("Not found", 404);
  await query("delete from events where id = $1", [params.id]);
  broadcast(ev.child_id, { kind: "event.deleted", id: params.id });
  return json({ ok: true });
}
