"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Bug #12 Fix: isolated client component just for router.back() */
export function BackButton() {
  const router = useRouter();
  return (
    <Button
      variant="glass"
      size="lg"
      className="w-full sm:w-auto"
      onClick={() => router.back()}
    >
      <ArrowLeft className="size-4" />
      Go back
    </Button>
  );
}
