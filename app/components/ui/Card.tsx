import { cn } from "@/lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Softer border for list rows vs. standalone cards. */
  subtle?: boolean;
}

/** Bordered white container used for list rows and grouped content. */
export default function Card({ subtle, className, children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-2xl border bg-white",
        subtle ? "border-gray-100 p-3" : "border-gray-200 p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
