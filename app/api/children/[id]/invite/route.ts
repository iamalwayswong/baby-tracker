import { z } from "zod";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser, json, error } from "@/lib/api";
import { caregiverRole } from "@/lib/auth";

const Body = z.object({ email: z.string().email() });

// POST /api/children/:id/invite — owner invites another caregiver by email
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const role = await caregiverRole(user.id, params.id);
  if (role !== "owner") return error("Only the owner can invite caregivers", 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Enter a valid email");
  const email = parsed.data.email.toLowerCase();

  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await query(
    `insert into invites (child_id, invited_by, email, token, expires_at)
     values ($1, $2, $3, $4, $5)`,
    [params.id, user.id, email, token, expires]
  );
  // Build the link from the host the request actually came in on, so it always
  // matches the deployed domain (falls back to APP_URL, then localhost).
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const base = host ? `${proto}://${host}` : process.env.APP_URL || "http://localhost:3000";
  return json({ token, url: `${base}/invite/${token}`, email });
}
