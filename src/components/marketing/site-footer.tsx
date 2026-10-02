import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  GithubIcon,
  InstagramIcon,
  XIcon,
  MailIcon,
  GlobeIcon,
} from "@/components/ui/brand-icons";
import { SITE } from "@/lib/site";

const COLUMNS = [
  {
    title: "Product",
    // The landing page lives at /welcome, not /. These anchors were left
    // pointing at the root, which the auth gate turns into a redirect to
    // /login — so every one of them was silently dead.
    links: [
      { label: "Features", href: "/welcome#features" },
      { label: "How it works", href: "/welcome#how" },
      { label: "Pricing", href: "/welcome#faq" },
      { label: "FAQ", href: "/welcome#faq" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Create account", href: "/signup" },
      { label: "Sign in", href: "/login" },
      { label: "Settings", href: "/settings" },
      { label: "Calls", href: "/call" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Developers", href: "/about#developers" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Contact", href: `mailto:${SITE.dev.supportEmail}` },
    ],
  },
];

const SOCIALS = [
  { href: SITE.dev.instagram, label: "Instagram", Icon: InstagramIcon },
  { href: SITE.dev.site, label: "Octa Devs website", Icon: GlobeIcon },
  { href: `mailto:${SITE.dev.email}`, label: "Email Octa Devs", Icon: MailIcon },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-10 border-t border-fg/8 px-5 pt-20 pb-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Link href="/welcome" className="inline-block">
              <Logo size={38} />
            </Link>
            <p className="mt-5 max-w-xs text-pretty text-sm leading-relaxed text-fg-3">
              {SITE.description}
            </p>

            <a
              href={`mailto:${SITE.dev.supportEmail}`}
              className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-fg/10 bg-fg/4 py-2 pr-4 pl-2 text-sm text-fg transition-colors hover:border-brand-400/50 hover:text-fg"
            >
              <span className="grid size-8 place-items-center rounded-full bg-[linear-gradient(140deg,var(--color-brand-500),#2255b8)] text-fg">
                <MailIcon className="size-4" />
              </span>
              {SITE.dev.supportEmail}
            </a>

            <div className="mt-6 flex gap-2.5">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="glass grid size-10 place-items-center rounded-full text-fg-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-fg"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-[0.68rem] font-semibold tracking-[0.2em] text-fg-3 uppercase">
                  {col.title}
                </h3>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="group inline-flex items-center gap-1.5 text-sm text-fg-2 transition-colors hover:text-fg"
                      >
                        <span className="h-px w-0 bg-brand-400 transition-all duration-300 group-hover:w-3" />
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-fg-3">
            © {year} {SITE.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-fg-3">
            <span>
              Crafted by{" "}
              <a
                href={SITE.dev.site}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg-2 underline-offset-4 transition-colors hover:text-fg hover:underline"
              >
                {SITE.dev.name}
              </a>
            </span>
            <span className="text-muted">·</span>
            <a
              href={SITE.dev.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-fg"
            >
              <InstagramIcon className="size-3.5" />
              {SITE.dev.instagramHandle}
            </a>
            <span className="text-muted">·</span>
            <Link href="/about" className="transition-colors hover:text-fg">
              About
            </Link>
            <Link href="/about#developers" className="transition-colors hover:text-fg">
              Developers
            </Link>
            <span className="text-muted">·</span>
            <Link href="/privacy" className="transition-colors hover:text-fg">
              Privacy
            </Link>
            <span className="text-muted">·</span>
            <Link href="/terms" className="transition-colors hover:text-fg">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}