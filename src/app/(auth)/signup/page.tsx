import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/auth-forms";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Join Omi Chat free — realtime messaging plus peer-to-peer voice and video calls.",
  robots: { index: false, follow: true },
};

function FormSkeleton() {
  return (
    <div className="glass-strong rounded-4xl p-7 sm:p-9">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-3 h-4 w-48" />
      <div className="mt-8 space-y-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        ))}
        <Skeleton className="h-13 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SignupForm />
    </Suspense>
  );
}