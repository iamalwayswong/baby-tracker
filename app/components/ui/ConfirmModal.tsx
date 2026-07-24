"use client";
import Button from "./Button";

export interface ConfirmModalProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" uses a solid red confirm button. */
  tone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Custom in-app confirmation dialog (replaces native window.confirm).
 * Centered modal above sheets (z-60). Tapping the backdrop cancels.
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  loading,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[60] mx-auto flex max-w-md items-center justify-center px-6" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{title}</h3>
        {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" fullWidth onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "destructive" : "primary"} fullWidth loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
