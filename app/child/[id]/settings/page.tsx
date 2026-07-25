import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser, caregiverRole } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import ChildSettings from "@/app/components/ChildSettings";

export default async function SettingsPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await caregiverRole(user.id, params.id);
  if (!role) notFound();

  const child = await queryOne<{ id: string; name: string; birth_date: string | null; sex: string }>(
    "select id, name, birth_date, sex from children where id = $1",
    [params.id]
  );
  if (!child) notFound();

  const caregivers = await query(
    `select u.id, u.name, u.email, cg.role
       from caregivers cg join users u on u.id = cg.user_id
      where cg.child_id = $1 order by cg.joined_at asc`,
    [params.id]
  );

  // active (pending, unexpired) invites, owner only — with links built from host
  let pendingInvites: { id: string; email: string; expiresAt: string; url: string }[] = [];
  if (role === "owner") {
    const rows = await query<{ id: string; email: string; token: string; expires_at: string }>(
      `select id, email, token, expires_at from invites
        where child_id = $1 and status = 'pending' and expires_at > now()
        order by created_at desc`,
      [params.id]
    );
    const h = headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const base = host ? `${proto}://${host}` : process.env.APP_URL || "";
    pendingInvites = rows.map((r) => ({ id: r.id, email: r.email, expiresAt: r.expires_at, url: `${base}/invite/${r.token}` }));
  }

  return <ChildSettings child={child} role={role} caregivers={caregivers} initialInvites={pendingInvites} />;
}
