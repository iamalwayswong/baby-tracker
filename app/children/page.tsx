import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import ChildrenList from "@/app/components/ChildrenList";

export default async function ChildrenPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const children = await query(
    `select c.id, c.name, c.birth_date, c.sex, cg.role
       from children c join caregivers cg on cg.child_id = c.id
      where cg.user_id = $1 order by c.created_at asc`,
    [user.id]
  );

  return <ChildrenList userName={user.name} initialChildren={children} />;
}
