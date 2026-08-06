import { cn } from "@/lib/cn";

type Tone = "default" | "danger" | "brand";

const TONES: Record<Tone, string> = {
  default: "text-ink-faint active:text-ink-soft",
  danger: "text-ink-faint active:text-red-600",
  brand: "text-ink-faint active:text-brand-600",
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label (also used as the tooltip). */
  label: string;
  tone?: Tone;
}

/** A tap target wrapping an icon/emoji — for edit, delete, close, etc. */
export default function IconButton({ label, tone = "default", className, children, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cn("tap p-1.5 text-base leading-none", TONES[tone], className)}
    >
      {children}
    </button>
  );
}
