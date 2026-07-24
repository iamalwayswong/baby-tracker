import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

// Smart landing:
//   0 kids  -> Kids page (to create the first one)
//   1 kid   -> straight to that kid's tracking page (the common case)
//   2+ kids -> the Kids list to choose
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const kids = await query<{ id: string }>(
    `select c.id from children c join caregivers cg on cg.child_id = c.id
      where cg.user_id = $1 order by c.created_at asc`,
    [user.id]
  );

  if (kids.length === 1) redirect(`/child/${kids[0].id}`);
  redirect("/children");
}
