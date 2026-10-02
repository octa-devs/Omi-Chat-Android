import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { SITE } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "Omi Chat",
    "chat",
    "messaging",
    "voice call",
    "video call",
    "WebRTC",
    "realtime",
    "Supabase",
    "glassmorphism",
  ],
  authors: [{ name: SITE.dev.name, url: SITE.dev.site }],
  creator: SITE.dev.name,
  publisher: SITE.dev.name,
  icons: {
    icon: [{ url: "/brand/omi-chat-logo.png", type: "image/png" }],
    apple: [{ url: "/brand/omi-chat-logo.png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: "/",
    images: [{ url: "/brand/omi-chat-logo.png", width: 1254, height: 1254 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/brand/omi-chat-logo.png"],
  },
  robots: { index: true, follow: true },
};

// Bug #10 Fix: colorScheme was "dark" but CSS uses light tokens.
// Aligning both to "light" so browser native UI (scrollbars, form inputs)
// render correctly alongside the light design.
export const viewport: Viewport = {
  themeColor: "#f4f6fb",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      data-accent="azure"
      data-theme="aurora"
      className={`${inter.variable} ${instrument.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}