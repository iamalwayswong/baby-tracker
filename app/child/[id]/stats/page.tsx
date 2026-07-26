import { redirect, notFound } from "next/navigation";
import { getCurrentUser, caregiverRole } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import StatsView from "@/app/components/StatsView";

export default async function StatsPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await caregiverRole(user.id, params.id))) notFound();

  const child = await queryOne<{ id: string; name: string }>(
    "select id, name from children where id = $1",
    [params.id]
  );
  if (!child) notFound();

  // last ~6 months of (non-deleted) events, so the date picker has history to
  // work with; aggregation happens client-side in the viewer's local timezone.
  const events = await query(
    `select type, start_time, end_time, data
       from events
      where child_id = $1 and deleted_at is null
        and start_time >= now() - interval '186 days'
      order by start_time asc`,
    [params.id]
  );

  return <StatsView childId={child.id} childName={child.name} events={events} />;
}
