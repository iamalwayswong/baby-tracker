import { cn } from "@/lib/cn";

type Option = string | { value: string; label: string };

export interface ToggleChipsProps {
  options: Option[];
  /** Selected values — any number can be on at once. */
  values: string[];
  onToggle: (value: string) => void;
  className?: string;
}

function opt(o: Option): { value: string; label: string } {
  return typeof o === "string" ? { value: o, label: o } : o;
}

/** A row of multi-select toggle chips (diaper contents, etc.) — like ChoiceChips
 *  but more than one can be active at a time. */
export default function ToggleChips({ options, values, onToggle, className }: ToggleChipsProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {options.map((raw) => {
        const o = opt(raw);
        const active = values.includes(o.value);
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onToggle(o.value)}
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
