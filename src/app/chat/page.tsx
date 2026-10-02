import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { PageSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Chats",
  description: "Your conversations on Omi Chat.",
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Loading chats" />}>
      <ChatWorkspace chatId={null} />
    </Suspense>
  );
}