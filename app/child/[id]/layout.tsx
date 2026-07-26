import ActiveTimers from "@/app/components/ActiveTimers";

// Wraps every /child/[id]/* route. The layout persists across navigation, so
// the active-timer banner stays live as you move between timeline, stats,
// manage and settings.
export default function ChildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <>
      <ActiveTimers childId={params.id} />
      {children}
    </>
  );
}
