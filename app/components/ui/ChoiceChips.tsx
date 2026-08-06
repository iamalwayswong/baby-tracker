import { cn } from "@/lib/cn";

type Option = string | { value: string; label: string };

export interface ChoiceChipsProps {
  options: Option[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  className?: string;
}

function opt(o: Option): { value: string; label: string } {
  return typeof o === "string" ? { value: o, label: o } : o;
}

/** A row of single-select toggle chips (diaper kind, sex, bottle contents…). */
export default function ChoiceChips({ options, value, onChange, className }: ChoiceChipsProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {options.map((raw) => {
        const o = opt(raw);
        const active = value === o.value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "tap flex-1 rounded-xl border py-2.5 text-sm font-medium capitalize transition-colors",
              active ? "border-brand-500 bg-accent-soft text-accent-soft-fg" : "border-line text-ink"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
