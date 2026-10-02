import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuroraFixed } from "@/components/ui/aurora";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SITE } from "@/lib/site";

/**
 * Shared shell for the legal documents.
 *
 * Both policies are long, and a wall of text with no way to navigate is a wall
 * nobody reads. The table of contents is generated from `sections` rather than
 * written by hand, so a heading can never drift out of sync with its link — the
 * failure mode of a hand-maintained legal index.
 */

export type LegalSection = {
  /** Anchor id. Must be unique within the document. */
  id: string;
  heading: string;
  /** Body copy. Separate items render as separate paragraphs. */
  paragraphs?: string[];
  /** Rendered as a bulleted list between `paragraphs` and `paragraphs_after`. */
  bullets?: string[];
  /**
   * Trailing copy, rendered after the list.
   *
   * Separate from `paragraphs` on purpose: a section that introduces a list and
   * then draws a conclusion from it should not force a heading or a duplicate
   * lead-in, and a single array cannot express "intro, list, outro" without
   * also allowing the intro to appear after the list.
   */
  paragraphs_after?: string[];
};

export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
  /** Rendered between the intro and the first section — used for the
   *  "plain-English summary" callout at the top of the privacy policy. */
  children?: ReactNode;
}) {
  return (
    <>
      <AuroraFixed intensity={0.7} />
      <SiteNav />

      <main className="relative px-5 pt-32 pb-24 sm:pt-36">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/welcome"
            className="inline-flex items-center gap-1.5 text-sm text-fg-3 transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            Back to {SITE.name}
          </Link>

          <header className="mt-8 max-w-3xl">
            <p className="text-[0.68rem] font-semibold tracking-[0.24em] text-brand-600 uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-3 font-display text-5xl leading-[1.05] text-balance text-fg sm:text-6xl">
              {title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-pretty text-fg-2">
              {intro}
            </p>
            <p className="mt-6 text-sm text-fg-3">
              Last updated{" "}
              <time dateTime={updated} className="text-fg-2">
                {new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </time>
              {" · "}
              <a
                href={`mailto:${SITE.dev.supportEmail}`}
                className="text-fg-2 underline-offset-4 hover:text-fg hover:underline"
              >
                {SITE.dev.supportEmail}
              </a>
            </p>
          </header>

          {children}

          <div className="mt-16 grid gap-12 lg:mt-20 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
            {/* ── contents ── */}
            <nav
              aria-label="Contents"
              className="lg:sticky lg:top-28 lg:self-start"
            >
              <h2 className="text-[0.68rem] font-semibold tracking-[0.2em] text-fg-3 uppercase">
                Contents
              </h2>
              <ol className="mt-5 space-y-2.5 border-l border-fg/10 pl-4">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="group flex gap-2 text-sm text-fg-3 transition-colors hover:text-fg"
                    >
                      <span className="font-mono text-[0.7rem] text-fg-3/70 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-pretty">{s.heading}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* ── body ── */}
            <div className="min-w-0 max-w-2xl">
              {sections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-28 border-t border-fg/8 pt-10 pb-2 first:border-t-0 first:pt-0 [&+section]:mt-10"
                >
                  <h2 className="font-display text-2xl leading-tight text-balance text-fg sm:text-[1.7rem]">
                    {s.heading}
                  </h2>
                  <div className="mt-5 space-y-4">
                    {s.paragraphs?.map((p, i) => (
                      <p
                        key={i}
                        className="text-[0.95rem] leading-[1.75] text-pretty text-fg-2"
                      >
                        {p}
                      </p>
                    ))}
                    {s.bullets && (
                      <ul className="space-y-2.5 pt-1">
                        {s.bullets.map((b, i) => (
                          <li
                            key={i}
                            className="flex gap-3 text-[0.95rem] leading-[1.7] text-pretty text-fg-2"
                          >
                            <span
                              aria-hidden
                              className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-brand-400"
                            />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.paragraphs_after?.map((p, i) => (
                      <p
                        key={`after-${i}`}
                        className="text-[0.95rem] leading-[1.75] text-pretty text-fg-2"
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                </section>
              ))}

              <div className="mt-14 rounded-4xl border border-fg/10 bg-fg/4 p-7">
                <h2 className="font-display text-xl text-fg">Questions?</h2>
                <p className="mt-2.5 text-sm leading-relaxed text-fg-2">
                  Write to{" "}
                  <a
                    href={`mailto:${SITE.dev.supportEmail}`}
                    className="font-medium text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline"
                  >
                    {SITE.dev.supportEmail}
                  </a>{" "}
                  and a real person from {SITE.dev.name} will answer — including
                  if you want to exercise a right described on this page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * Callout used for the plain-English summary at the top of the privacy policy.
 * The legal text below it is precise but dense; this is the part most people
 * will actually read, so it is not a substitute for the sections.
 */
export function LegalNote({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-12 max-w-3xl rounded-4xl border border-brand-400/25 bg-brand-50/60 p-7 sm:p-8">
      <h2 className="text-[0.68rem] font-semibold tracking-[0.2em] text-brand-700 uppercase">
        {title}
      </h2>
      <ul className="mt-5 space-y-3">
        {Array.isArray(children)
          ? children.map((child, i) => (
              <li
                key={i}
                className="flex gap-3 text-[0.95rem] leading-[1.7] text-pretty text-fg"
              >
                <span
                  aria-hidden
                  className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-brand-500"
                />
                <span>{child}</span>
              </li>
            ))
          : children}
      </ul>
    </div>
  );
}
