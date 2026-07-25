import { z } from "zod";
import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireUser, json, error } from "@/lib/api";
import { caregiverRole } from "@/lib/auth";

// GET /api/children/:id — child details + caregivers (must be a caregiver)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const role = await caregiverRole(user.id, params.id);
  if (!role) return error("Not found", 404);

  const child = await queryOne(
    "select id, name, birth_date, sex from children where id = $1",
    [params.id]
  );
  const caregivers = await query(
    `select u.id, u.name, u.email, cg.role
       from caregivers cg join users u on u.id = cg.user_id
      where cg.child_id = $1
      order by cg.joined_at asc`,
    [params.id]
  );
  return json({ child, caregivers, role });
}

const Patch = z.object({
  name: z.string().min(1).optional(),
  birth_date: z.string().nullable().optional(),
  sex: z.enum(["male", "female", "unspecified"]).optional(),
});

// PATCH /api/children/:id — edit child details (any caregiver)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!(await caregiverRole(user.id, params.id))) return error("Not found", 404);

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid child details");
  const { name, birth_date, sex } = parsed.data;

  const rows = await query(
    `update children set
        name       = coalesce($2, name),
        birth_date = case when $3::boolean then $4 else birth_date end,
        sex        = coalesce($5, sex)
      where id = $1
      returning id, name, birth_date, sex`,
    [params.id, name ?? null, birth_date !== undefined, birth_date ?? null, sex ?? null]
  );
  return json({ child: rows[0] });
}

// DELETE /api/children/:id — owner only; cascades to events/caregivers/invites
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if ((await caregiverRole(user.id, params.id)) !== "owner") {
    return error("Only the owner can delete this child", 403);
  }
  await query("delete from children where id = $1", [params.id]);
  return json({ ok: true });
}
