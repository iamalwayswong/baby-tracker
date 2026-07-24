import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import InviteAccept from "@/app/components/InviteAccept";

async function fetchInvite(token: string) {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  const res = await fetch(`${proto}://${host}/api/invites/${token}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function InvitePage({ params }: { params: { token: string } }) {
  const info = await fetchInvite(params.token);
  const user = await getCurrentUser();
  return <InviteAccept token={params.token} info={info} loggedIn={!!user} />;
}
