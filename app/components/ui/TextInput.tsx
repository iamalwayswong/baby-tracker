import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Standard text/date/number input. Restyle inputs app-wide here. */
const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      {...rest}
      className={cn(
        "w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-base text-ink outline-none placeholder:text-ink-faint focus:border-brand-500",
        className
      )}
    />
  );
});

export default TextInput;
