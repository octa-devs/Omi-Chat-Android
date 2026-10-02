"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Compass, Home, LifeBuoy, Sparkles } from "lucide-react";
import { AuroraFixed } from "@/components/ui/aurora";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { SITE } from "@/lib/site";

const SUGGESTIONS = [
  { href: "/chat", label: "Open your chats", icon: Sparkles },
  { href: "/about", label: "About Omi Chat", icon: Compass },
  { href: `mailto:${SITE.dev.supportEmail}`, label: "Email support", icon: LifeBuoy },
];

export default function NotFound() {
  const router = useRouter();

  return (
    <>
      <AuroraFixed intensity={0.75} />

      <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-20">
        <div className="w-full max-w-2xl text-center">
          <Link href="/" className="inline-block">
            <Logo size={40} />
          </Link>

          {/* big 404 with the mark sitting in the zero */}
          <div className="relative mt-14 select-none">
            <motion.p
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-[clamp(6rem,26vw,15rem)] leading-[0.82] tracking-[-0.05em] text-gradient"
            >
              404
            </motion.p>
            <motion.span
              initial={{ opacity: 0, y: 24, rotate: -18 }}
              animate={{ opacity: 1, y: 0, rotate: -8 }}
              transition={{ delay: 0.45, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <span className="block size-24 rounded-full bg-brand-200/70 blur-2xl sm:size-32" />
            </motion.span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="mt-10 font-display text-[clamp(1.9rem,5vw,2.9rem)] leading-tight text-fg text-balance">
              This message never arrived.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-pretty text-fg-2">
              The page you are looking for was moved, renamed, or never existed in
              the first place. Let us point you back somewhere useful.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/" size="lg" className="w-full sm:w-auto">
                <Home className="size-4" />
                Back to home
              </ButtonLink>
              <Button
                variant="glass"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => router.back()}
              >
                <ArrowLeft className="size-4" />
                Go back
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.8 }}
            className="mt-14"
          >
            <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-fg-3 uppercase">
              Try one of these
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {SUGGESTIONS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="glass group inline-flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-4 text-sm text-fg transition-all duration-300 hover:-translate-y-0.5 hover:text-fg"
                >
                  <Icon className="size-4 text-brand-600 transition-transform duration-500 group-hover:scale-110" />
                  {label}
                </Link>
              ))}
            </div>

            <p className="mt-12 text-xs text-fg-3">
              Lost something specific?{" "}
              <a
                href={`mailto:${SITE.dev.supportEmail}`}
                className="text-brand-600 underline-offset-4 transition-colors hover:text-brand-700 hover:underline"
              >
                Write to {SITE.dev.name}
              </a>
            </p>
          </motion.div>
        </div>
      </main>
    </>
  );
}