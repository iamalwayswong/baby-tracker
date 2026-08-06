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
        "w-full rounded-xl border border-line px-4 py-3 text-base outline-none focus:border-brand-500",
        className
      )}
    />
  );
});

export default TextInput;
