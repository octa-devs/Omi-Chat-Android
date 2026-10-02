import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Placeholder for a conversation row in the sidebar. */
export function SkeletonChatRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Skeleton className="size-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2.5 w-9 shrink-0" />
        </div>
        <Skeleton className="h-2.5 w-44" />
      </div>
    </div>
  );
}

/** Placeholder for a message bubble. */
export function SkeletonBubble({ own = false }: { own?: boolean }) {
  return (
    <div className={cn("flex w-full", own ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "space-y-2 rounded-3xl px-4 py-3",
          own
            ? "w-2/5 rounded-br-lg bg-fg/8"
            : "w-3/5 rounded-bl-lg bg-fg/5",
        )}
      >
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-3xl p-6", className)}>
      <Skeleton className="mb-4 size-11 rounded-2xl" />
      <Skeleton className="mb-2.5 h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-5/6" />
    </div>
  );
}

/** Generic full-page loading state with the Omi mark. */
export function PageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[70dvh] flex-col items-center justify-center gap-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative size-16">
        <div className="absolute inset-0 rounded-full border-2 border-fg/10" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-400 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full bg-brand-200/70 blur-md" />
      </div>
      <p className="font-display text-lg tracking-wide text-fg-3">{label}…</p>
    </div>
  );
}