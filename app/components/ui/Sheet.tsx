"use client";
import { cn } from "@/lib/cn";

export interface SheetProps {
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Bottom sheet scaffold: dimmed backdrop + rounded panel that slides up from
 * the bottom, with a drag handle and optional centered title. Tapping the
 * backdrop closes it; taps inside are contained.
 */
export default function Sheet({ onClose, title, children, className }: SheetProps) {
  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className={cn("relative w-full rounded-t-3xl bg-white px-5 pb-8 pt-4", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-300" />
        {title && <h2 className="mb-4 text-center text-lg font-semibold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
