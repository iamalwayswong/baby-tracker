"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Kid = { id: string; name: string };

// The tappable child name in the header. Opens a dropdown to switch between
// kids, add a new one, or jump to app settings.
export default function ChildSwitcher({ current, siblings }: { current: Kid; siblings: Kid[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function go(href: string) {
    setOpen(false);
    router.push(href);
    router.refresh();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="tap flex items-center gap-1">
        <span className="font-bold leading-tight">{current.name}</span>
        <span className="text-xs text-gray-400">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 z-50 mt-2 w-60 -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1 text-left shadow-xl">
            {siblings.map((k) => {
              const isCurrent = k.id === current.id;
              return (
                <button
                  key={k.id}
                  onClick={() => (isCurrent ? setOpen(false) : go(`/child/${k.id}`))}
                  className="tap flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm active:bg-gray-50"
                >
                  <span>👶</span>
                  <span className={`flex-1 truncate ${isCurrent ? "font-semibold" : ""}`}>{k.name}</span>
                  {isCurrent && <span className="text-brand-600">✓</span>}
                </button>
              );
            })}
            <div className="my-1 border-t border-gray-100" />
            <button onClick={() => go("/children?add=1")} className="tap flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-brand-600 active:bg-gray-50">
              <span>＋</span> Add a child
            </button>
            <button onClick={() => go("/settings")} className="tap flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-600 active:bg-gray-50">
              <span>⚙</span> App settings
            </button>
          </div>
        </>
      )}
    </div>
  );
}
