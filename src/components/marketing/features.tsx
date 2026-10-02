"use client";

import { motion } from "framer-motion";
import {
  MessageSquare,
  Phone,
  Search,
  Palette,
  Shield,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { RevealGroup, RevealItem, Reveal } from "@/components/motion/reveal";
import { SpotlightCard } from "./spotlight-card";
import { SITE } from "@/lib/site";

const ICONS: Record<string, LucideIcon> = {
  message: MessageSquare,
  phone: Phone,
  search: Search,
  palette: Palette,
  shield: Shield,
  bolt: Zap,
};

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal
      className={
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"
      }
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-fg/10 bg-fg/4 px-3.5 py-1.5 text-[0.68rem] font-semibold tracking-[0.2em] text-brand-600 uppercase">
        {eyebrow}
      </span>
      <h2 className="mt-6 font-display text-[clamp(2.1rem,4.6vw,3.35rem)] leading-[1.08] tracking-[-0.02em] text-fg text-balance">
        {title}
      </h2>
      {body && (
        <p className="mt-5 text-pretty text-[1.02rem] leading-relaxed text-fg-2">
          {body}
        </p>
      )}
    </Reveal>
  );
}

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-24 px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Features"
          title={
            <>
              Everything a chat app should have,{" "}
              <span className="text-gradient-brand">nothing it shouldn't</span>
            </>
          }
          body="Omi Chat is deliberately small and fast. Six things done properly beat sixty done halfway."
        />

        <RevealGroup className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SITE.features.map((f) => {
            const Icon = ICONS[f.icon] ?? Zap;
            return (
              <RevealItem key={f.title}>
                <SpotlightCard className="group h-full">
                  <div className="relative z-10 flex h-full flex-col">
                    <span className="mb-5 grid size-12 place-items-center rounded-2xl border border-fg/10 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-brand-500)_26%,transparent),transparent)] text-brand-600 transition-all duration-500 group-hover:scale-110 group-hover:text-fg">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="font-display text-2xl leading-tight text-fg">
                      {f.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-fg-2">
                      {f.body}
                    </p>
                    <span className="hairline mt-6 w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                </SpotlightCard>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ── how it works ─────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    title: "Create your identity",
    body: "Sign up with an email, pick a display name and claim a unique @handle. That handle is how your friends find you inside Omi Chat.",
    accent: "color-mix(in oklab, var(--color-brand-400) 26%, transparent)",
  },
  {
    n: "02",
    title: "Open a conversation",
    body: "Search a name, tap once, and a private thread opens. Type indicators, read receipts and replies keep the rhythm natural.",
    accent: "color-mix(in oklab, var(--color-gold-400) 30%, transparent)",
  },
  {
    n: "03",
    title: "Talk it out",
    body: "Hit the audio or video button. WebRTC connects the two browsers directly — drop the mic, flip the camera, share your screen.",
    accent: "color-mix(in oklab, var(--color-mint-400) 26%, transparent)",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-24 px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              Three taps from{" "}
              <span className="text-gradient">nothing to hello</span>
            </>
          }
        />

        <div className="relative mt-20">
          {/* connector */}
          <div
            aria-hidden
            className="absolute top-[3.4rem] right-[16%] left-[16%] hidden h-px bg-[linear-gradient(90deg,transparent,var(--color-brand-400),transparent)] lg:block"
          />
          <RevealGroup className="grid gap-6 lg:grid-cols-3" staggerAmount={0.15}>
            {STEPS.map((s, i) => (
              <RevealItem key={s.n}>
                <div className="group relative text-center lg:px-6">
                  <motion.span
                    whileHover={{ scale: 1.08, rotate: -4 }}
                    className={`relative mx-auto mb-7 grid size-20 place-items-center rounded-3xl bg-[linear-gradient(140deg,${s.accent},transparent)] font-display text-3xl text-fg ring-1 ring-fg/10 backdrop-blur-xl`}
                  >
                    {s.n}
                  </motion.span>
                  <h3 className="font-display text-[1.65rem] leading-tight text-fg">
                    {s.title}
                  </h3>
                  <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-fg-2">
                    {s.body}
                  </p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        <Reveal delay={0.1} className="mt-16">
          <div className="glass glass-sheen grain relative overflow-hidden rounded-4xl px-8 py-12 text-center sm:px-14">
            <p className="font-display text-[clamp(1.7rem,3.6vw,2.7rem)] leading-tight text-fg text-balance">
              “It feels like the chat app that{" "}
              <span className="text-gradient-brand">finally caught up</span> with
              the rest of 2026.”
            </p>
            <p className="mt-6 text-sm text-fg-3">
              — the Omi Chat early-access crew
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── stats strip ──────────────────────────────────────────── */

const STATS = [
  { value: "<100ms", label: "Typing indicator latency" },
  { value: "P2P", label: "Calls never hit our servers" },
  { value: "0", label: "Ads, trackers or dark patterns" },
  { value: "24/7", label: "Realtime message delivery" },
];

export function Stats() {
  return (
    <section className="px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-4xl border border-fg/10 bg-fg/10 lg:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="group relative bg-white px-6 py-9 text-center transition-colors duration-500 hover:bg-brand-50"
              >
                <p className="font-display text-[clamp(1.9rem,4vw,2.7rem)] leading-none text-gradient">
                  {s.value}
                </p>
                <p className="mt-3 text-xs tracking-wide text-fg-3">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}