"use client";

import { motion } from "framer-motion";
import {
  Phone,
  Video,
  Check,
  CheckCheck,
  Mic,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import { SplitWords } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { SITE } from "@/lib/site";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── mock conversation ────────────────────────────────────── */

const BUBBLES = [
  { me: false, text: "Finally — a chat app that doesn't feel like 2014.", delay: 0.5 },
  { me: true, text: "Right? The glass reads so much better on a real display.", delay: 1.1 },
  { me: false, text: "And calls connect instantly. No waiting for 'ringing'.", delay: 1.8 },
  { me: true, text: "Try the call button in the top right 🙂", delay: 2.5 },
] as const;

function MockChat() {
  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-fg/8 px-5 py-4">
        <Avatar id="u_aarav" name="Aarav Mehta" size="md" presence="online" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">Aarav Mehta</p>
          <p className="flex items-center gap-1.5 text-xs text-mint-600">
            <span className="size-1.5 rounded-full bg-mint-400" />
            online now
          </p>
        </div>
        <div className="flex gap-1.5">
          {[Phone, Video].map((Icon, i) => (
            <motion.span
              key={i}
              whileHover={{ scale: 1.12 }}
              className="grid size-8 place-items-center rounded-full bg-ink-800 text-fg-2"
            >
              <Icon className="size-3.5" />
            </motion.span>
          ))}
        </div>
      </div>

      {/* messages */}
      <div className="flex flex-1 flex-col justify-end gap-2.5 px-4 py-5">
        {BUBBLES.map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: b.delay, duration: 0.6, ease: EASE }}
            className={`flex ${b.me ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                b.me
                  ? "max-w-[78%] rounded-3xl rounded-br-lg bg-[linear-gradient(120deg,var(--color-brand-500),var(--color-brand-700))] px-3.5 py-2.5 text-[0.8rem] leading-snug text-on-accent shadow-[0_10px_28px_-14px_rgba(42,103,204,0.5)]"
                  : "max-w-[78%] rounded-3xl rounded-bl-lg border border-fg/10 bg-white px-3.5 py-2.5 text-[0.8rem] leading-snug text-fg"
              }
            >
              {b.text}
              {b.me && (
                <span className="mt-1 flex items-center justify-end gap-1 text-[0.6rem] text-white/80">
                  10:4{i} <CheckCheck className="size-3 text-mint-200" />
                </span>
              )}
            </div>
          </motion.div>
        ))}

        {/* typing indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.1 }}
          className="flex justify-start"
        >
          <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg border border-fg/10 bg-white px-4 py-3">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 rounded-full bg-brand-400"
                animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* composer */}
      <div className="border-t border-fg/8 px-4 py-3.5">
        <div className="flex items-center gap-2 rounded-full border border-fg/10 bg-ink-800 py-1.5 pr-1.5 pl-4">
          <span className="text-sm text-fg-3">Type a message…</span>
          <span className="ml-auto grid size-8 place-items-center rounded-full bg-[linear-gradient(120deg,var(--color-brand-500),var(--color-brand-700))]">
            <Check className="size-3.5 text-on-accent" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── hero ─────────────────────────────────────────────────── */

const PILLARS = [
  { icon: Zap, label: "Sub-second delivery" },
  { icon: Mic, label: "WebRTC voice & video" },
  { icon: Shield, label: "Yours, on your Supabase" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pt-36 pb-20 sm:pt-44 lg:pt-48">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── copy ── */}
        <div className="relative z-10 text-center lg:text-left">
          <motion.a
            href="/#features"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="glass group inline-flex items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 text-xs text-fg transition-colors hover:text-fg"
          >
            <span className="rounded-full bg-[linear-gradient(120deg,var(--color-brand-500),var(--color-brand-700))] px-2.5 py-1 text-[0.65rem] font-semibold tracking-wider text-on-accent uppercase">
              New
            </span>
            Screen sharing now live in every call
            <Sparkles className="size-3.5 text-brand-600 transition-transform duration-500 group-hover:rotate-12" />
          </motion.a>

          <h1 className="mt-7 font-display text-[clamp(2.7rem,7.2vw,4.9rem)] leading-[1.02] tracking-[-0.02em] text-fg">
            <SplitWords text="Conversations" />
            <br />
            <SplitWords text="that feel" delay={0.2} />{" "}
            <span className="relative inline-block">
              <SplitWords text="effortless." delay={0.42} />
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.5, duration: 1, ease: EASE }}
                className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-[linear-gradient(90deg,var(--color-brand-400),var(--color-gold-400))]"
              />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8, ease: EASE }}
            className="mx-auto mt-7 max-w-xl text-pretty text-[1.05rem] leading-relaxed text-fg-2 lg:mx-0"
          >
            {SITE.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.8, ease: EASE }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <ButtonLink href="/signup" size="lg" className="w-full sm:w-auto">
              <Sparkles className="size-4" />
              Create free account
            </ButtonLink>
            <ButtonLink
              href={`mailto:${SITE.dev.supportEmail}`}
              variant="glass"
              size="lg"
              className="w-full sm:w-auto"
            >
              Talk to Octa Devs
            </ButtonLink>
          </motion.div>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 1.1 } } }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 lg:justify-start"
          >
            {PILLARS.map(({ icon: Icon, label }) => (
              <motion.li
                key={label}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0 },
                }}
                className="flex items-center gap-2 text-[0.8rem] text-fg-2"
              >
                <Icon className="size-3.5 text-brand-600" />
                {label}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* ── floating UI ── */}
        <motion.div
          initial={{ opacity: 0, y: 60, rotate: -3, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 1.2, ease: EASE }}
          className="relative mx-auto w-full max-w-[22rem] lg:max-w-none"
        >
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div className="glass-strong glass-sheen grain relative overflow-hidden rounded-4xl shadow-[0_60px_140px_-40px_rgba(19,23,37,0.3)]">
              <MockChat />
            </div>

            {/* incoming call card */}
            <motion.div
              initial={{ opacity: 0, x: -30, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 1.9, duration: 0.9, ease: EASE }}
              className="glass-strong absolute -bottom-10 -left-6 flex w-64 items-center gap-3 rounded-3xl p-3.5 shadow-[0_30px_70px_-30px_rgba(19,23,37,0.26)] sm:-left-10"
            >
              <span className="relative">
                <Avatar id="u_riya" name="Riya Sen" size="lg" presence="online" />
                <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-full border border-mint-400/40" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.68rem] tracking-wider text-mint-600 uppercase">
                  Incoming
                </p>
                <p className="truncate text-sm font-medium text-fg">Riya Sen</p>
              </div>
              <div className="flex gap-1.5">
                <span className="grid size-8 place-items-center rounded-full bg-rust-500 text-on-accent">
                  <Phone className="size-3.5 -rotate-[135deg]" />
                </span>
                <span className="grid size-8 place-items-center rounded-full bg-mint-500 text-[#06231f]">
                  <Video className="size-3.5" />
                </span>
              </div>
            </motion.div>

            {/* privacy card */}
            <motion.div
              initial={{ opacity: 0, x: 30, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 2.25, duration: 0.9, ease: EASE }}
              className="glass-strong absolute -top-8 -right-4 hidden items-center gap-2.5 rounded-2xl px-4 py-3 shadow-[0_24px_60px_-28px_rgba(19,23,37,0.26)] sm:flex lg:-right-8"
            >
              <Shield className="size-4 text-gold-700" />
              <span className="text-xs text-fg">End-to-end peer-to-peer</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}