import { z } from "zod";
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireUser, json, error } from "@/lib/api";
import { caregiverRole } from "@/lib/auth";
import { isEventType } from "@/lib/events";
import { broadcast } from "@/lib/realtime";

// Bulk create / update / delete of events for one child, applied atomically.
// Powers the spreadsheet-style "All entries" grid.

const Create = z.object({
  type: z.string(),
  start_time: z.string().optional(),
  end_time: z.string().nullable().optional(),
  data: z.record(z.string(), z.any()).optional(),
  note: z.string().nullable().optional(),
});
const Update = z.object({
  id: z.string().uuid(),
  type: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().nullable().optional(),
  data: z.record(z.string(), z.any()).optional(),
  note: z.string().nullable().optional(),
});
const Body = z.object({
  creates: z.array(Create).default([]),
  updates: z.array(Update).default([]),
  deletes: z.array(z.string().uuid()).default([]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!(await caregiverRole(user.id, params.id))) return error("Not found", 404);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid batch");
  const { creates, updates, deletes } = parsed.data;

  for (const c of creates) {
    if (!isEventType(c.type)) return error(`Unknown event type: ${c.type}`);
  }

  const created: any[] = [];
  const updated: any[] = [];

  const client = await getPool().connect();
  try {
    await client.query("begin");

    for (const c of creates) {
      const { rows } = await client.query(
        `insert into events (child_id, type, start_time, end_time, data, note, created_by, updated_by)
         values ($1, $2, coalesce($3, now()), $4, $5, $6, $7, $7)
         returning id, type, start_time, end_time, data, note, created_by`,
        [params.id, c.type, c.start_time ?? null, c.end_time ?? null, JSON.stringify(c.data ?? {}), c.note ?? null, user.id]
      );
      created.push({ ...rows[0], created_by_name: user.name });
    }

    for (const u of updates) {
      if (u.type && !isEventType(u.type)) throw new Error(`Unknown event type: ${u.type}`);
      const { rows } = await client.query(
        `update events set
            type       = coalesce($10, type),
            start_time = coalesce($3, start_time),
            end_time   = case when $4::boolean then $5 else end_time end,
            data       = coalesce($6, data),
            note       = case when $7::boolean then $8 else note end,
            updated_by = $9, updated_at = now()
          where id = $1 and child_id = $2
          returning id, type, start_time, end_time, data, note, created_by`,
        [
          u.id,
          params.id,
          u.start_time ?? null,
          u.end_time !== undefined,
          u.end_time ?? null,
          u.data ? JSON.stringify(u.data) : null,
          u.note !== undefined,
          u.note ?? null,
          user.id,
          u.type ?? null,
        ]
      );
      if (rows[0]) updated.push({ ...rows[0], created_by_name: user.name });
    }

    let deleted: string[] = [];
    if (deletes.length) {
      const { rows } = await client.query(
        `update events set deleted_at = now(), updated_by = $3
          where child_id = $1 and id = any($2::uuid[]) and deleted_at is null
          returning id`,
        [params.id, deletes, user.id]
      );
      deleted = rows.map((r) => r.id);
    }

    await client.query("commit");

    // notify the other caregiver(s) live
    created.forEach((e) => broadcast(params.id, { kind: "event.created", event: e }));
    updated.forEach((e) => broadcast(params.id, { kind: "event.updated", event: e }));
    deleted.forEach((id) => broadcast(params.id, { kind: "event.deleted", id }));

    return json({ created, updated, deleted });
  } catch (e: any) {
    await client.query("rollback");
    return error(e?.message || "Batch failed", 500);
  } finally {
    client.release();
  }
}
