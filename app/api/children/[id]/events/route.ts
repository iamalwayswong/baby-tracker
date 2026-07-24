import { z } from "zod";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser, json, error } from "@/lib/api";
import { caregiverRole } from "@/lib/auth";
import { isEventType } from "@/lib/events";
import { broadcast } from "@/lib/realtime";

// GET /api/children/:id/events?limit=100 — recent timeline (newest first)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!(await caregiverRole(user.id, params.id))) return error("Not found", 404);

  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? 100), 500);
  const rows = await query(
    `select e.id, e.type, e.start_time, e.end_time, e.data, e.note,
            e.created_by, u.name as created_by_name
       from events e join users u on u.id = e.created_by
      where e.child_id = $1 and e.deleted_at is null
      order by e.start_time desc
      limit $2`,
    [params.id, limit]
  );
  return json({ events: rows });
}

const Body = z.object({
  type: z.string(),
  start_time: z.string().optional(),
  end_time: z.string().nullable().optional(),
  data: z.record(z.string(), z.any()).optional(),
  note: z.string().optional(),
});

// POST /api/children/:id/events — log a new event
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!(await caregiverRole(user.id, params.id))) return error("Not found", 404);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid event");
  const { type, start_time, end_time, data, note } = parsed.data;
  if (!isEventType(type)) return error("Unknown event type");

  const rows = await query(
    `insert into events (child_id, type, start_time, end_time, data, note, created_by, updated_by)
     values ($1, $2, coalesce($3, now()), $4, $5, $6, $7, $7)
     returning id, type, start_time, end_time, data, note, created_by`,
    [params.id, type, start_time ?? null, end_time ?? null, JSON.stringify(data ?? {}), note ?? null, user.id]
  );
  const event = { ...rows[0], created_by_name: user.name };
  broadcast(params.id, { kind: "event.created", event });
  return json({ event });
}
