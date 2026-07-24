"use client";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface SheetProps {
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Show the top-right close (✕) button. Default true. */
  showClose?: boolean;
}

/**
 * Bottom sheet scaffold: dimmed backdrop + rounded panel that slides up, with a
 * drag handle, optional centered title, and a close button. Tapping the
 * backdrop, tapping ✕, or dragging the handle down all call onClose (the parent
 * decides what that means — e.g. confirm unsaved changes first).
 */
export default function Sheet({ onClose, title, children, className, showClose = true }: SheetProps) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    startY.current = e.clientY;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startY.current == null) return;
    const dy = e.clientY - startY.current;
    if (dy > 0) setDragY(dy);
  }
  function onPointerUp() {
    if (startY.current == null) return;
    const shouldClose = dragY > 80;
    startY.current = null;
    setDragY(0);
    if (shouldClose) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className={cn("relative w-full rounded-t-3xl bg-white px-5 pb-8 pt-3", className)}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: startY.current == null ? "transform 0.2s ease-out" : undefined,
        }}
      >
        {/* draggable grip */}
        <div
          className="tap -mx-5 -mt-3 cursor-grab px-5 pb-2 pt-3 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-300" />
        </div>

        {showClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="tap absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 active:bg-gray-100"
          >
            ✕
          </button>
        )}

        {title && <h2 className="mb-4 mt-1 text-center text-lg font-semibold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
