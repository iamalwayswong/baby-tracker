import { z } from "zod";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser, json, error } from "@/lib/api";
import { caregiverRole } from "@/lib/auth";
import { sendEmail, inviteEmail } from "@/lib/email";

const Body = z.object({ email: z.string().email() });

// Base URL from the request host, so links match the deployed domain.
function baseUrl(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return host ? `${proto}://${host}` : process.env.APP_URL || "http://localhost:3000";
}

// GET /api/children/:id/invite — list active (pending, unexpired) invites
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if ((await caregiverRole(user.id, params.id)) !== "owner") return error("Only the owner can view invites", 403);

  const rows = await query<{ id: string; email: string; token: string; expires_at: string; created_at: string }>(
    `select id, email, token, expires_at, created_at
       from invites
      where child_id = $1 and status = 'pending' and expires_at > now()
      order by created_at desc`,
    [params.id]
  );
  const base = baseUrl(req);
  return json({
    invites: rows.map((r) => ({ id: r.id, email: r.email, expiresAt: r.expires_at, url: `${base}/invite/${r.token}` })),
  });
}

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
  const rows = await query<{ id: string; expires_at: string }>(
    `insert into invites (child_id, invited_by, email, token, expires_at)
     values ($1, $2, $3, $4, $5)
     returning id, expires_at`,
    [params.id, user.id, email, token, expires]
  );
  const base = baseUrl(req);
  const url = `${base}/invite/${token}`;

  // fetch child name for the email; best-effort send (invite stands regardless)
  const child = await query<{ name: string }>("select name from children where id = $1", [params.id]);
  const { sent } = await sendEmail({ to: email, ...inviteEmail(user.name, child[0]?.name ?? "their baby", url) });

  return json({ id: rows[0].id, token, url, email, expiresAt: rows[0].expires_at, emailed: sent });
}
