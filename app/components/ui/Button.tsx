import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white active:bg-brand-700",
  secondary: "border border-gray-300 text-gray-700 active:bg-gray-50",
  ghost: "text-brand-600 active:text-brand-700",
  danger: "border border-red-300 text-red-600 active:bg-red-50",
};

const SIZES: Record<Size, string> = {
  sm: "px-4 py-1.5 text-sm",
  md: "px-4 py-3.5",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  /** Show a loading affordance and disable the button. */
  loading?: boolean;
}

/** The one button in the app. Change styling here to restyle every button. */
export default function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "tap rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
        SIZES[size],
        VARIANTS[variant],
        fullWidth && "w-full",
        className
      )}
    >
      {loading ? "…" : children}
    </button>
  );
}
