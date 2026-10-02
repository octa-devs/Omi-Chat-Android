"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./features";
import { SITE } from "@/lib/site";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative scroll-mt-24 px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          body="Still stuck? Write to us and a human from Octa Devs will reply."
        />

        <div className="mt-14 space-y-3">
          {SITE.faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.04}>
                <div
                  className={
                    isOpen
                      ? "glass-strong overflow-hidden rounded-3xl"
                      : "glass-subtle overflow-hidden rounded-3xl transition-colors duration-300 hover:border-fg/14"
                  }
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left"
                  >
                    <span
                      className={
                        isOpen
                          ? "font-display text-xl text-fg"
                          : "text-[0.95rem] font-medium text-fg transition-colors hover:text-fg"
                      }
                    >
                      {f.q}
                    </span>
                    <span
                      className={
                        isOpen
                          ? "grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"
                          : "grid size-7 shrink-0 place-items-center rounded-full bg-fg/6 text-fg-3"
                      }
                    >
                      {isOpen ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-6 text-pretty text-sm leading-relaxed text-fg-2">
                          {f.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="relative px-5 py-20 sm:py-28">
      <Reveal className="mx-auto max-w-6xl">
        <div className="glass-strong grain relative overflow-hidden rounded-[2.5rem] px-8 py-20 text-center sm:px-16 sm:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 size-105 -translate-x-1/2 rounded-full bg-brand-300/60 blur-[120px]"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-3xl font-display text-[clamp(2.2rem,5.4vw,3.9rem)] leading-[1.05] tracking-[-0.02em] text-fg text-balance">
              Your next conversation is{" "}
              <span className="text-gradient-brand">one click away</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-fg-2">
              Free to join. No card, no phone number, no catch. Bring your people
              and start talking in under a minute.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/signup"
                className="group relative inline-flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[linear-gradient(105deg,var(--color-brand-500),var(--color-brand-700)_55%,#2255b8)] px-8 text-[0.95rem] font-medium text-fg shadow-[0_18px_55px_-14px_rgba(42,103,204,0.32)] transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent,rgb(255_255_255/0.3),transparent)] transition-transform duration-900 group-hover:translate-x-full" />
                <span className="relative z-10">Get started free</span>
              </a>
              <a
                href={`mailto:${SITE.dev.supportEmail}`}
                className="glass inline-flex h-13 w-full items-center justify-center rounded-full px-8 text-[0.95rem] font-medium text-fg transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
              >
                hello@octadevs.fun
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}