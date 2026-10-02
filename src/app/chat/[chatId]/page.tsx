import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { PageSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  return (
    <Suspense fallback={<PageSkeleton label="Loading conversation" />}>
      <ChatWorkspace chatId={chatId} />
    </Suspense>
  );
}