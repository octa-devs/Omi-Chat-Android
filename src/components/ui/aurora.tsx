"use client";

import { cn } from "@/lib/utils";

/**
 * Ambient aurora field: three blurred, slowly drifting colour blobs + a faint
 * grid and a film-grain pass. Pure CSS so it costs nothing on the main thread.
 */
export function Aurora({
  className,
  intensity = 1,
}: {
  className?: string;
  intensity?: number;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ opacity: intensity, contain: "strict" }}
    >
      <div
        className="absolute -top-[28%] left-[8%] h-[46rem] w-[46rem] rounded-full blur-[80px] sm:blur-[130px] animate-float-a"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, color-mix(in oklab, var(--color-brand-400) 34%, transparent), transparent 66%)",
          transform: "translate3d(0,0,0)",
          backfaceVisibility: "hidden",
          willChange: "transform",
        }}
      />
      <div
        className="absolute -top-[12%] right-[2%] h-[40rem] w-[40rem] rounded-full blur-[90px] sm:blur-[140px] animate-float-b"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, color-mix(in oklab, var(--color-brand-300) 30%, transparent), transparent 66%)",
          transform: "translate3d(0,0,0)",
          backfaceVisibility: "hidden",
          willChange: "transform",
        }}
      />
      <div
        className="absolute bottom-[-22%] left-[28%] h-[38rem] w-[38rem] rounded-full blur-[100px] sm:blur-[150px] animate-float-c"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--color-gold-400) 24%, transparent), transparent 66%)",
          transform: "translate3d(0,0,0)",
          backfaceVisibility: "hidden",
          willChange: "transform",
        }}
      />
      <div className="grid-lines absolute inset-0" />
      <div className="grain absolute inset-0" />
    </div>
  );
}

/** Full-viewport fixed aurora used behind app pages. */
export function AuroraFixed({ intensity = 1 }: { intensity?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      <Aurora intensity={intensity} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_-8%,transparent,var(--color-ink-950)_88%)]" />
    </div>
  );
}