import type { Metadata } from "next";
import { AuroraFixed } from "@/components/ui/aurora";
import { SiteNav } from "@/components/marketing/site-nav";
import { Hero } from "@/components/marketing/hero";
import { Features, HowItWorks, Stats } from "@/components/marketing/features";
import { Faq, CtaBand } from "@/components/marketing/faq";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: "/welcome" },
};

export default function WelcomePage() {
  return (
    <>
      <AuroraFixed intensity={0.92} />
      <SiteNav />
      <main id="main">
        <Hero />
        <Features />
        <HowItWorks />
        <Stats />
        <Faq />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}