import Link from "next/link";
import { Check, Sparkles, Shield, Zap } from "lucide-react";
import { AuroraFixed } from "@/components/ui/aurora";
import { Logo } from "@/components/ui/logo";
import { SITE } from "@/lib/site";

const POINTS = [
  "Realtime messaging with typing and read receipts",
  "Peer-to-peer audio & video calls over WebRTC",
  "Group chats, screen sharing and call history",
  "Yours on your own Supabase project — no ads, ever",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh lg:grid lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.05fr_0.95fr]">
      <AuroraFixed intensity={0.85} />

      {/* ── brand panel ── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16">
        <Link href="/welcome" className="w-fit">
          <Logo size={40} />
        </Link>

        <div className="relative z-10 max-w-lg">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.68rem] font-semibold tracking-[0.2em] text-brand-600 uppercase">
            <Sparkles className="size-3.5" />
            {SITE.tagline}
          </span>

          <h1 className="mt-7 font-display text-[clamp(2.4rem,4.4vw,3.6rem)] leading-[1.05] tracking-[-0.02em] text-fg text-balance">
            Conversations that feel{" "}
            <span className="text-gradient-brand">effortless</span>.
          </h1>

          <p className="mt-5 max-w-md text-pretty leading-relaxed text-fg-2">
            {SITE.description}
          </p>

          <ul className="mt-10 space-y-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-400/25">
                  <Check className="size-3.5" />
                </span>
                <span className="text-sm leading-relaxed text-fg">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-xs text-fg-3">
          <span className="flex items-center gap-2">
            <Shield className="size-3.5 text-gold-700" />
            Media never touches a server
          </span>
          <span className="flex items-center gap-2">
            <Zap className="size-3.5 text-mint-600" />
            Built by {SITE.dev.name}
          </span>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-32 size-125 rounded-full bg-brand-200/70 blur-[140px]"
        />
      </aside>

      {/* ── form panel ── */}
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-14 sm:px-8">
        <Link href="/welcome" className="mb-8 lg:hidden">
          <Logo size={38} />
        </Link>
        <div className="w-full max-w-md">{children}</div>

        <p className="mt-10 text-center text-xs text-fg-3">
          Protected by Supabase Authentication ·{" "}
          <a
            href={`mailto:${SITE.dev.supportEmail}`}
            className="text-fg-2 underline-offset-4 hover:text-fg hover:underline"
          >
            Need help?
          </a>
        </p>
      </main>
    </div>
  );
}