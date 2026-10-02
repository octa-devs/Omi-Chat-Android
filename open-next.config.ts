// Which caching strategies the adapter uses.
//
// This app does not use ISR, revalidation or the incremental cache: every
// page either renders on demand (auth, chat, calls) or is fully static
// (legal pages, marketing). So the defaults are correct and no R2 bucket is
// bound in wrangler.jsonc. Revisit this if static pages ever start needing to
// be rebuilt without a deploy.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();