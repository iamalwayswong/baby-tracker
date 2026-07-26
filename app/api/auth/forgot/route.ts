import { z } from "zod";
import { randomBytes } from "crypto";
import { query, queryOne } from "@/lib/db";
import { json, error } from "@/lib/api";
import { sendEmail, resetEmail } from "@/lib/email";

const Body = z.object({ email: z.string().email() });

// POST /api/auth/forgot — email a password-reset link if the account exists.
// Always returns ok (never reveals whether an email is registered).
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Enter a valid email");
  const email = parsed.data.email.toLowerCase();

  const user = await queryOne<{ id: string }>("select id from users where email = $1", [email]);
  if (user) {
    const token = randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h
    await query(
      "insert into password_resets (user_id, token, expires_at) values ($1, $2, $3)",
      [user.id, token, expires]
    );
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const base = host ? `${proto}://${host}` : process.env.APP_URL || "http://localhost:3000";
    await sendEmail({ to: email, ...resetEmail(`${base}/reset/${token}`) });
  }

  return json({ ok: true });
}
