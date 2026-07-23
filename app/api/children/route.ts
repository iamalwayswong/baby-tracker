import { z } from "zod";
import { NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";
import { requireUser, json, error } from "@/lib/api";

// GET /api/children — children the current user is a caregiver on
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const rows = await query(
    `select c.id, c.name, c.birth_date, c.sex, cg.role
       from children c
       join caregivers cg on cg.child_id = c.id
      where cg.user_id = $1
      order by c.created_at asc`,
    [user.id]
  );
  return json({ children: rows });
}

const Body = z.object({
  name: z.string().min(1),
  birth_date: z.string().optional().nullable(),
  sex: z.enum(["male", "female", "unspecified"]).default("unspecified"),
});

// POST /api/children — create a child and make the creator its owner
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid child details");
  const { name, birth_date, sex } = parsed.data;

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      "insert into children (name, birth_date, sex, created_by) values ($1, $2, $3, $4) returning id, name, birth_date, sex",
      [name, birth_date || null, sex, user.id]
    );
    const child = rows[0];
    await client.query(
      "insert into caregivers (child_id, user_id, role) values ($1, $2, 'owner')",
      [child.id, user.id]
    );
    await client.query("commit");
    return json({ child: { ...child, role: "owner" } });
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
