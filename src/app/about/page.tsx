import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, ShieldCheck, Gauge, Heart, Layers, Code2 } from "lucide-react";
import { AuroraFixed } from "@/components/ui/aurora";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SectionHeading } from "@/components/marketing/features";
import { SpotlightCard } from "@/components/marketing/spotlight-card";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  GithubIcon,
  InstagramIcon,
  GlobeIcon,
  MailIcon,
} from "@/components/ui/brand-icons";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `Why ${SITE.name} exists, how it is built, and the team behind it — ${SITE.dev.name}.`,
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    icon: Gauge,
    title: "Fast is a feature",
    body: "Every interaction is measured. A skeleton appears in the same frame as the tap, and real content streams in behind it.",
  },
  {
    icon: ShieldCheck,
    title: "Private by architecture",
    body: "Calls never touch our servers, and your data lives in your own Supabase project. No ad networks, no shadow profiles.",
  },
  {
    icon: Heart,
    title: "Craft over clutter",
    body: "Six features polished until they feel inevitable beat sixty half-finished ones. Restraint is the whole design brief.",
  },
  {
    icon: Layers,
    title: "Honest about limits",
    body: "If something is not finished, it says so. No fake progress bars, no dark patterns, no growth hacks.",
  },
];

const STACK = [
  { name: "Next.js", note: "App Router + server rendering" },
  { name: "React 19", note: "Concurrent UI primitives" },
  { name: "Supabase", note: "Auth, Postgres, Realtime, Storage" },
  { name: "WebRTC", note: "Peer-to-peer voice & video" },
  { name: "Tailwind v4", note: "Design-token theming" },
  { name: "Framer Motion", note: "Physics-based choreography" },
];

export default function AboutPage() {
  return (
    <>
      <AuroraFixed intensity={0.85} />
      <SiteNav />

      <main id="main" className="relative">
        {/* ── hero ─────────────────────────────────────────── */}
        <section className="px-5 pt-36 pb-20 sm:pt-44">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-fg/10 bg-fg/4 px-3.5 py-1.5 text-[0.68rem] font-semibold tracking-[0.2em] text-brand-600 uppercase">
                <Sparkles className="size-3.5" />
                About Omi
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="mt-7 font-display text-[clamp(2.6rem,6.4vw,4.6rem)] leading-[1.02] tracking-[-0.025em] text-fg text-balance">
                Chat should feel like a{" "}
                <span className="text-gradient">calm room</span>, not a firehose
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mx-auto mt-7 max-w-2xl text-pretty text-[1.05rem] leading-relaxed text-fg-2">
                {SITE.name} is a small, deliberately opinionated messaging and
                calling app. It does the essentials beautifully — realtime text,
                crystal-clear peer-to-peer calls, honest presence — and quietly
                refuses to do the rest.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink href="/signup" size="lg">
                  Try it free
                </ButtonLink>
                <ButtonLink href="/about#developers" variant="glass" size="lg">
                  Meet the team
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── principles ───────────────────────────────────── */}
        <section className="px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Principles"
              title={
                <>
                  Four rules we{" "}
                  <span className="text-gradient-brand">refuse to break</span>
                </>
              }
              body="These are not aspirations pinned to a wall — they are the constraints the product is actually built against."
            />

            <RevealGroup className="mt-16 grid gap-5 sm:grid-cols-2">
              {PRINCIPLES.map(({ icon: Icon, title, body }) => (
                <RevealItem key={title}>
                  <SpotlightCard className="group h-full">
                    <div className="relative z-10">
                      <span className="mb-5 grid size-12 place-items-center rounded-2xl border border-fg/10 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-brand-500)_26%,transparent),transparent)] text-brand-600 transition-all duration-500 group-hover:scale-110 group-hover:text-fg">
                        <Icon className="size-5" />
                      </span>
                      <h3 className="font-display text-2xl leading-tight text-fg">
                        {title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-fg-2">
                        {body}
                      </p>
                    </div>
                  </SpotlightCard>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── stack ────────────────────────────────────────── */}
        <section className="px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="glass-strong grain relative overflow-hidden rounded-4xl px-7 py-12 sm:px-12">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-24 right-0 size-80 rounded-full bg-brand-200/70 blur-[110px]"
                />
                <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                  <div>
                    <span className="inline-flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.2em] text-fg-3 uppercase">
                      <Code2 className="size-3.5" />
                      Under the hood
                    </span>
                    <h2 className="mt-5 font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.08] text-fg text-balance">
                      Modern tools, used properly
                    </h2>
                    <p className="mt-4 text-pretty text-sm leading-relaxed text-fg-2">
                      No exotic stack for the sake of it. Everything here is
                      boring, well-supported technology chosen because it makes
                      the product feel instant and stay maintainable.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {STACK.map((s, i) => (
                      <Reveal key={s.name} delay={i * 0.05}>
                        <div className="glass-subtle flex items-center gap-3 rounded-2xl px-4 py-3.5">
                          <span className="size-2 shrink-0 rounded-full bg-brand-400 shadow-[0_0_12px_var(--color-brand-400)]" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-fg">
                              {s.name}
                            </p>
                            <p className="truncate text-xs text-fg-3">
                              {s.note}
                            </p>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── developers ───────────────────────────────────── */}
        <section
          id="developers"
          className="scroll-mt-24 px-5 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              eyebrow="Developers"
              title={
                <>
                  Designed &amp; built by{" "}
                  <span className="text-gradient-brand">{SITE.dev.name}</span>
                </>
              }
              body="A small studio that ships premium web experiences. Omi Chat is our love letter to the humble chat app."
            />

            <Reveal className="mt-16">
              <div className="glass-strong glass-sheen grain relative overflow-hidden rounded-[2.5rem] p-8 sm:p-12">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-28 -left-16 size-90 rounded-full bg-brand-300/60 blur-[110px]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -bottom-28 size-80 rounded-full bg-gold-300/50 blur-[110px]"
                />

                <div className="relative flex flex-col items-center gap-10 text-center lg:flex-row lg:items-center lg:gap-14 lg:text-left">
                  <div className="relative shrink-0">
                    <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-full border border-brand-400/55" />
                    <div className="glass grid size-32 place-items-center rounded-[2rem]">
                      <Logo variant="mark" size={72} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[0.68rem] font-semibold tracking-[0.24em] text-brand-600 uppercase">
                      The studio
                    </p>
                    <h3 className="mt-2 font-display text-[clamp(2rem,4.6vw,3rem)] leading-none text-fg">
                      {SITE.dev.name}
                    </h3>
                    <p className="mt-5 text-pretty text-sm leading-relaxed text-fg-2">
                      We build fast, tasteful, privacy-respecting products for the
                      open web. From glass-and-light interfaces to realtime
                      infrastructure, everything is engineered in-house — and
                      every detail is argued over.
                    </p>

                    <div className="mt-8 flex flex-wrap justify-center gap-2.5 lg:justify-start">
                      <a
                        href={SITE.dev.site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass inline-flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-3 text-sm text-fg transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-400/50 hover:text-fg"
                      >
                        <GlobeIcon className="size-4 text-brand-600" />
                        octadevs.fun
                      </a>
                      <a
                        href={SITE.dev.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass inline-flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-3 text-sm text-fg transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-400/50 hover:text-fg"
                      >
                        <InstagramIcon className="size-4 text-brand-600" />
                        {SITE.dev.instagramHandle}
                      </a>
                      <a
                        href={`mailto:${SITE.dev.email}`}
                        className="glass inline-flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-3 text-sm text-fg transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-400/50 hover:text-fg"
                      >
                        <MailIcon className="size-4 text-brand-600" />
                        {SITE.dev.email}
                      </a>
                      <a
                        href={`mailto:${SITE.dev.supportEmail}`}
                        className="glass inline-flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-3 text-sm text-fg transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-400/50 hover:text-fg"
                      >
                        <ShieldCheck className="size-4 text-mint-600" />
                        Support
                      </a>
                    </div>
                  </div>
                </div>

                <div className="hairline my-10" />

                <div className="relative grid gap-6 sm:grid-cols-3">
                  {[
                    { label: "Website", value: "www.octadevs.fun", href: SITE.dev.site },
                    {
                      label: "Instagram",
                      value: SITE.dev.instagramHandle,
                      href: SITE.dev.instagram,
                    },
                    {
                      label: "Email",
                      value: SITE.dev.email,
                      href: `mailto:${SITE.dev.email}`,
                    },
                  ].map((row) => (
                    <a
                      key={row.label}
                      href={row.href}
                      target={row.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="group text-center lg:text-left"
                    >
                      <p className="text-[0.66rem] font-semibold tracking-[0.2em] text-fg-3 uppercase">
                        {row.label}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-fg transition-colors group-hover:text-fg">
                        {row.value}
                        <span className="text-brand-600 transition-transform duration-300 group-hover:translate-x-0.5">
                          →
                        </span>
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="mt-10">
              <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
                <p className="text-sm text-fg-3">
                  Want to work with us, or just say hello?
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <a
                    href={SITE.dev.site}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Octa Devs on the web"
                    className="glass grid size-10 place-items-center rounded-full text-fg-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-fg"
                  >
                    <GlobeIcon className="size-4" />
                  </a>
                  <a
                    href={SITE.dev.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Octa Devs on Instagram"
                    className="glass grid size-10 place-items-center rounded-full text-fg-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-fg"
                  >
                    <InstagramIcon className="size-4" />
                  </a>
                  <a
                    href={`mailto:${SITE.dev.email}`}
                    aria-label="Email Octa Devs"
                    className="glass grid size-10 place-items-center rounded-full text-fg-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-fg"
                  >
                    <MailIcon className="size-4" />
                  </a>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Octa Devs on GitHub"
                    className="glass grid size-10 place-items-center rounded-full text-fg-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-fg"
                  >
                    <GithubIcon className="size-4" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── closing ──────────────────────────────────────── */}
        <section className="px-5 pb-24 sm:pb-32">
          <Reveal className="mx-auto max-w-4xl">
            <div className="glass rounded-4xl px-8 py-14 text-center">
              <h2 className="font-display text-[clamp(1.8rem,4vw,2.8rem)] leading-tight text-fg text-balance">
                Enough reading.{" "}
                <span className="text-gradient-brand">Start talking.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-pretty text-sm text-fg-2">
                Your account takes a minute. Your first conversation takes a
                second.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink href="/signup" size="lg">
                  Create your account
                </ButtonLink>
                <Link
                  href="/#faq"
                  className="text-sm text-fg-2 underline-offset-4 transition-colors hover:text-fg hover:underline"
                >
                  Read the FAQ
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
