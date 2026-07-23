import { requireUser } from "@/lib/api";
import { json } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  return json({ user });
}
