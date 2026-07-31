import { redirect, notFound } from "next/navigation";
import { getCurrentUser, caregiverRole } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import ChildTimeline from "@/app/components/ChildTimeline";

export default async function ChildPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { open?: string };
}) {
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
      where e.child_id = $1 and e.deleted_at is null
      order by e.start_time desc limit 200`,
    [params.id]
  );

  // all kids this user cares for, for the name-dropdown switcher
  const siblings = await query<{ id: string; name: string }>(
    `select c.id, c.name from children c join caregivers cg on cg.child_id = c.id
      where cg.user_id = $1 order by c.created_at asc`,
    [user.id]
  );

  return (
    <ChildTimeline
      child={child}
      initialEvents={events}
      siblings={siblings}
      openNursing={searchParams?.open === "nursing"}
    />
  );
}
