import type { Metadata } from "next";
import { Suspense } from "react";
import { CallHub } from "@/components/call/call-hub";
import { PageSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Calls",
  description: "Your WebRTC call history and quick-dial contacts on Omi Chat.",
  robots: { index: false, follow: false },
};

export default function CallPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Opening calls" />}>
      <CallHub />
    </Suspense>
  );
}
