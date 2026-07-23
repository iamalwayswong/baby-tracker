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
