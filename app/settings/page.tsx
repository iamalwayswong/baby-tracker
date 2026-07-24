import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppSettings from "@/app/components/AppSettings";

export default async function AppSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppSettings user={{ name: user.name, email: user.email }} />;
}
