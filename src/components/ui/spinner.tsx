import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "size-5 shrink-0 animate-spin rounded-full border-2 border-fg/25 border-t-white",
        className,
      )}
    />
  );
}