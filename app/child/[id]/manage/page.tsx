import { redirect, notFound } from "next/navigation";
import { getCurrentUser, caregiverRole } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import EventsGrid from "@/app/components/EventsGrid";

export default async function ManagePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await caregiverRole(user.id, params.id))) notFound();

  const child = await queryOne<{ id: string; name: string }>(
    "select id, name from children where id = $1",
    [params.id]
  );
  if (!child) notFound();

  const events = await query(
    `select e.id, e.type, e.start_time, e.end_time, e.data, e.note, u.name as created_by_name
       from events e join users u on u.id = e.created_by
      where e.child_id = $1 order by e.start_time desc limit 500`,
    [params.id]
  );

  return <EventsGrid childId={child.id} childName={child.name} initialEvents={events} />;
}
