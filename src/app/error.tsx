"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TriangleAlert, RotateCw, Home } from "lucide-react";
import { AuroraFixed } from "@/components/ui/aurora";
import { Button, ButtonLink } from "@/components/ui/button";
import { SITE } from "@/lib/site";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a real deployment forward this to your analytics sink.
    console.error("[Omi Chat] route error:", error);
  }, [error]);

  return (
    <>
      <AuroraFixed intensity={0.6} />
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong grain w-full max-w-lg rounded-4xl p-10 text-center"
        >
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-[linear-gradient(140deg,rgba(224,51,79,0.28),transparent)] text-rust-600 ring-1 ring-rust-400/20">
            <TriangleAlert className="size-7" />
          </span>

          <h1 className="mt-7 font-display text-4xl text-fg">
            Something broke
          </h1>
          <p className="mt-3 text-pretty text-fg-2">
            An unexpected error interrupted that page. This is almost always
            temporary — try again, and if it keeps happening let us know.
          </p>

          {error.digest && (
            <p className="mt-4 font-mono text-[0.7rem] text-fg-3">
              reference: {error.digest}
            </p>
          )}

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={reset} className="w-full sm:w-auto">
              <RotateCw className="size-4" />
              Try again
            </Button>
            <ButtonLink
              href="/"
              variant="glass"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Home className="size-4" />
              Home
            </ButtonLink>
          </div>

          <p className="mt-8 text-xs text-fg-3">
            Need a hand?{" "}
            <a
              href={`mailto:${SITE.dev.supportEmail}`}
              className="text-brand-600 underline-offset-4 hover:underline"
            >
              {SITE.dev.supportEmail}
            </a>
          </p>
        </motion.div>
      </main>
    </>
  );
}