import { NextResponse } from "next/server";
import { getCurrentUser, SessionUser } from "./auth";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Returns the session user or a 401 response. Use: `const u = await requireUser(); if (u instanceof NextResponse) return u;` */
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return error("Not authenticated", 401);
  return user;
}
