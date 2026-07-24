import { redirect, notFound } from "next/navigation";
import { getCurrentUser, caregiverRole } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import ChildTimeline from "@/app/components/ChildTimeline";

export default async function ChildPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await caregiverRole(user.id, params.id);
  if (!role) notFound();

  const child = await queryOne<{ id: string; name: string; birth_date: string | null; sex: string }>(
    "select id, name, birth_date, sex from children where id = $1",
    [params.id]
  );
  if (!child) notFound();

  const events = await query(
    `select e.id, e.type, e.start_time, e.end_time, e.data, e.note,
            e.created_by, u.name as created_by_name
       from events e join users u on u.id = e.created_by
      where e.child_id = $1 order by e.start_time desc limit 100`,
    [params.id]
  );

  // how many kids this user has, so we only show "‹ Kids" when it's useful
  const siblings = await query<{ n: string }>(
    "select count(*)::text as n from caregivers where user_id = $1",
    [user.id]
  );
  const siblingCount = Number(siblings[0]?.n ?? "1");

  return <ChildTimeline child={child} initialEvents={events} siblingCount={siblingCount} />;
}
