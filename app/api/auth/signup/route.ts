import { z } from "zod";
import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { hashPassword, signToken, SESSION_COOKIE } from "@/lib/auth";
import { json, error } from "@/lib/api";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid signup details");
  const { email, password, name } = parsed.data;

  const existing = await queryOne("select id from users where email = $1", [email.toLowerCase()]);
  if (existing) return error("An account with that email already exists", 409);

  const rows = await query<{ id: string; email: string; name: string }>(
    "insert into users (email, password_hash, name) values ($1, $2, $3) returning id, email, name",
    [email.toLowerCase(), await hashPassword(password), name]
  );
  const user = rows[0];
  cookies().set(SESSION_COOKIE, signToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return json({ user });
}
