import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsView } from "@/components/settings/settings-view";
import { PageSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your Omi Chat profile, appearance, chat and privacy.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Opening settings" />}>
      <SettingsView />
    </Suspense>
  );
}
