"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
    >
      <nav
        className={cn(
          "mx-auto flex h-15 max-w-6xl items-center justify-between rounded-full px-3 transition-all duration-500 sm:px-4",
          scrolled
            ? "glass-strong shadow-[0_20px_60px_-30px_rgba(19,23,37,0.22)]"
            : "border border-transparent bg-transparent",
        )}
      >
        <Link href="/welcome" className="pl-2 transition-opacity hover:opacity-85">
          <Logo size={30} />
          <span className="sr-only">Omi Chat home</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="relative rounded-full px-4 py-2 text-sm text-fg transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ButtonLink
            href="/login"
            variant="ghost"
            size="sm"
            className="hidden px-4 sm:inline-flex"
          >
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            <Sparkles className="size-3.5" />
            Get started
          </ButtonLink>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="glass ml-0.5 grid size-9 place-items-center rounded-full text-fg md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong mx-auto mt-2 max-w-6xl overflow-hidden rounded-3xl p-2 md:hidden"
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3 text-sm text-fg transition-colors hover:bg-fg/8 hover:text-fg"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-4 py-3 text-sm text-fg transition-colors hover:bg-fg/8 hover:text-fg"
            >
              Sign in
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}