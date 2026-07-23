import { z } from "zod";
import { cookies } from "next/headers";
import { queryOne } from "@/lib/db";
import { verifyPassword, signToken, SESSION_COOKIE } from "@/lib/auth";
import { json, error } from "@/lib/api";

const Body = z.object({ email: z.string().email(), password: z.string() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid login details");
  const { email, password } = parsed.data;

  const row = await queryOne<{ id: string; email: string; name: string; password_hash: string }>(
    "select id, email, name, password_hash from users where email = $1",
    [email.toLowerCase()]
  );
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return error("Incorrect email or password", 401);
  }
  const user = { id: row.id, email: row.email, name: row.name };
  cookies().set(SESSION_COOKIE, signToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return json({ user });
}
