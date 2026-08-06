import { cn } from "@/lib/cn";

export interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** A labelled form control: a label above its input(s). */
export default function Field({ label, children, className }: FieldProps) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
