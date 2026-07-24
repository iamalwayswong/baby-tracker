import { redirect, notFound } from "next/navigation";
import { getCurrentUser, caregiverRole } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import ChildSettings from "@/app/components/ChildSettings";

export default async function SettingsPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await caregiverRole(user.id, params.id);
  if (!role) notFound();

  const child = await queryOne<{ id: string; name: string }>(
    "select id, name from children where id = $1",
    [params.id]
  );
  if (!child) notFound();

  const caregivers = await query(
    `select u.id, u.name, u.email, cg.role
       from caregivers cg join users u on u.id = cg.user_id
      where cg.child_id = $1 order by cg.joined_at asc`,
    [params.id]
  );

  return <ChildSettings child={child} role={role} caregivers={caregivers} />;
}
