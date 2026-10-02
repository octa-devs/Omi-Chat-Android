/** Single source of truth for brand copy, links and credits. */
export const SITE = {
  name: "Omi Chat",
  tagline: "Conversations that feel effortless.",
  description:
    "Omi Chat is a premium realtime messaging and calling app — instant chat, high-quality WebRTC voice & video calls, and an interface built from glass and light.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "hello@octadevs.fun",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  dev: {
    name: "Octa Devs",
    site: "https://www.octadevs.fun",
    instagram: "https://instagram.com/octadevsofficial",
    instagramHandle: "@octadevsofficial",
    email: "hello@octadevs.fun",
    supportEmail: "hello@octadevs.fun",
  },
  features: [
    {
      icon: "message",
      title: "Realtime messaging",
      body: "Sub-second delivery, live typing indicators, read receipts, replies, reactions and full-text history — streamed straight from your Postgres database.",
    },
    {
      icon: "phone",
      title: "Crystal calls",
      body: "Peer-to-peer WebRTC audio and video with screen sharing, live mic/camera state, ringing and a full call log. No media ever touches our servers.",
    },
    {
      icon: "search",
      title: "Find anyone",
      body: "Claim a unique @username, then search people and start a direct conversation in one tap. Group chats with avatars are supported too.",
    },
    {
      icon: "palette",
      title: "Tune the atmosphere",
      body: "Four accent palettes and four ambient themes, glass surfaces tuned per-component, plus reduced-motion and keyboard-first accessibility.",
    },
    {
      icon: "shield",
      title: "Private by default",
      body: "Block anyone, mute a thread, and keep presence honest with automatic online/offline detection. All data is scoped to your Supabase project.",
    },
    {
      icon: "bolt",
      title: "Instant by design",
      body: "Server-rendered shell, streaming skeletons and lazy media acquisition mean the app is interactive the moment it paints.",
    },
  ],
  faqs: [
    {
      q: "What do I need to get started?",
      a: "An email address and a password. That is it — no phone number, no card, no downloads. Open the app, sign up, and start talking.",
    },
    {
      q: "How do the calls work?",
      a: "Calls use WebRTC, so audio and video travel directly between the two browsers. Supabase is used only to exchange the connection handshake, never the media itself.",
    },
    {
      q: "Can I call someone on a different network?",
      a: "Usually yes. Omi Chat ships with public STUN servers. For the toughest corporate NATs you can add your own TURN relay via the NEXT_PUBLIC_TURN_URLS environment variable.",
    },
    {
      q: "Is Omi Chat free?",
      a: "The software is free to use. Supabase infrastructure usage is subject to their own pricing, which is generous on the free Spark plan for early projects.",
    },
    {
      q: "Can I change the look?",
      a: "Open Settings → Appearance to switch accent colour and ambient theme. Every choice is saved to your profile and syncs across devices.",
    },
    {
      q: "Who built this?",
      a: "Omi Chat is designed and engineered by Octa Devs. See the About page for links, or write to hello@octadevs.fun for anything at all.",
    },
  ],
} as const;