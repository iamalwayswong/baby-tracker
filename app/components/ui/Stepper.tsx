export interface StepperProps {
  label: string;
  value: number;
  step: number;
  unit?: string;
  min?: number;
  onChange: (value: number) => void;
}

/** A labelled +/- number stepper for quick numeric entry (ml, cm, g…). */
export default function Stepper({ label, value, step, unit, min = 0, onChange }: StepperProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
      <span className="text-sm text-ink-soft">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="tap h-8 w-8 rounded-full bg-surface-muted text-lg active:bg-line"
          onClick={() => onChange(Math.max(min, value - step))}
        >
          −
        </button>
        <span className="w-20 text-center font-semibold tabular-nums">
          {value} {unit}
        </span>
        <button
          type="button"
          className="tap h-8 w-8 rounded-full bg-surface-muted text-lg active:bg-line"
          onClick={() => onChange(value + step)}
        >
          +
        </button>
      </div>
    </div>
  );
}
