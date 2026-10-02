import type { Metadata } from "next";
import { Suspense } from "react";
import { CallScreen } from "@/components/call/call-screen";
import { PageSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "In call",
  robots: { index: false, follow: false },
};

export default async function CallRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return (
    <Suspense fallback={<PageSkeleton label="Joining call" />}>
      <CallScreen callId={roomId} />
    </Suspense>
  );
}
