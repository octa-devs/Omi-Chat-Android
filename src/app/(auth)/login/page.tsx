import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Omi Chat to continue your conversations and calls.",
  robots: { index: false, follow: true },
};

function FormSkeleton() {
  return (
    <div className="glass-strong rounded-4xl p-7 sm:p-9">
      <Skeleton className="h-10 w-52" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-8 space-y-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        ))}
        <Skeleton className="h-13 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}