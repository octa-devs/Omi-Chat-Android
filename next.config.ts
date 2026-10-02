import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(), display-capture=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

// Lets `next dev` resolve Cloudflare bindings locally, by starting Miniflare
// against wrangler.jsonc.
//
// Guarded on NODE_ENV because this spawns the workerd binary during config
// evaluation, and `next build` evaluates the config too. On Windows that
// binary crashes with an access violation, which fails the build for a reason
// that has nothing to do with the app. Binding resolution is only ever wanted
// in `next dev`; a production build reads bindings from Cloudflare instead.
if (process.env.NODE_ENV !== "production") {
  initOpenNextCloudflareForDev();
}