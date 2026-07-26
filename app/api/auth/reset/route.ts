import { z } from "zod";
import { cookies } from "next/headers";
import { getPool, queryOne } from "@/lib/db";
import { hashPassword, signToken, SESSION_COOKIE } from "@/lib/auth";
import { json, error } from "@/lib/api";

const Body = z.object({ token: z.string().min(1), password: z.string().min(8) });

// POST /api/auth/reset — set a new password from a valid reset token, then
// sign the user in.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Password must be at least 8 characters");
  const { token, password } = parsed.data;

  const reset = await queryOne<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    "select id, user_id, expires_at, used_at from password_resets where token = $1",
    [token]
  );
  if (!reset || reset.used_at || new Date(reset.expires_at) <= new Date()) {
    return error("This reset link is invalid or expired", 410);
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("update users set password_hash = $2 where id = $1", [reset.user_id, await hashPassword(password)]);
    await client.query("update password_resets set used_at = now() where id = $1", [reset.id]);
    // invalidate any other outstanding resets for this user
    await client.query("update password_resets set used_at = now() where user_id = $1 and used_at is null", [reset.user_id]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }

  const u = await queryOne<{ id: string; email: string; name: string }>(
    "select id, email, name from users where id = $1",
    [reset.user_id]
  );
  if (u) {
    cookies().set(SESSION_COOKIE, signToken(u), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  return json({ ok: true });
}
