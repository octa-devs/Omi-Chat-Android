import { PageSkeleton } from "@/components/ui/skeleton";

/** Streamed instantly while a route segment resolves on the server. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <PageSkeleton label="Warming up" />
    </div>
  );
}