# Omi Chat

A premium, glassmorphic **realtime messaging + WebRTC calling** web app, built with
Next.js (App Router), React 19, Tailwind v4 and Supabase.

- **Messaging** — realtime text, typing indicators, read receipts, replies,
  attachments (Supabase Storage), group chats, presence, full-text search.
- **Calling** — peer-to-peer audio & video over WebRTC with screen sharing,
  live mic/camera state, ringing and a full call log.
- **Feel** — server-rendered shell, streaming skeleton loaders, four accent
  palettes, four ambient themes, reduced-motion support.
- **Design & build** — [Octa Devs](https://www.octadevs.fun) ·
  [@octadevsofficial](https://instagram.com/octadevsofficial) ·
  hello@octadevs.fun

---

## 1. Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Environment variables live in `.env` (already filled in for this project). See
`.env.example` for the annotated list.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe key; RLS enforces access |
| `NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT` | OAuth callback the browser lands on |
| `NEXT_PUBLIC_SUPABASE_SITE_URL` | Canonical site URL |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL used by metadata |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support address shown in the UI |
| `NEXT_PUBLIC_TURN_URLS` | Comma-separated STUN/TURN URLs for WebRTC |

> `.env` is committed deliberately: it holds only the **publishable** key, which
> is designed to be public. The secret key, if you ever need one, belongs in
> `.env.local` (git-ignored) and must never carry a `NEXT_PUBLIC_` prefix —
> Next.js inlines those into the browser bundle at build time.

---

## 2. Backend setup — **required**

The app is **not usable** until the schema exists and the auth providers are
switched on. Both steps are manual.

### 2a. Apply the schema

```bash
npm run db:reset     # prints this reminder; the real work is the next line
```

Open <https://supabase.com/dashboard> → your project → **SQL Editor** → **New**,
paste the whole of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
and run it.

That single file creates everything:

- 9 tables — `profiles`, `blocked`, `chats`, `chat_members`, `messages`,
  `calls`, `call_members`, `call_ring`, `call_logs`
- Row Level Security on every one, plus the `is_chat_member()` /
  `is_call_member()` helpers that back it
- the `handle_new_user()` and `touch_chat()` triggers
- the private `attachments` Storage bucket and its policies
- realtime publication entries
- `search_messages()` plus the `get_profiles()` / `get_inbox()` / `get_chat()`
  RPCs

It is idempotent, so re-running it is safe.

> **Nothing works until this runs.** Without the tables every query fails.

### 2b. Authentication

**Email + password**

Supabase → **Authentication** → **Providers** → **Email**. Enable it. Leave
*Confirm email* on if you want to verify addresses; turn it off if you want
instant sign-up during testing.

**Google**

Two consoles, and both are needed.

1. **Google Cloud Console** → *APIs & Services* → **Credentials** → **Create
   credentials** → **OAuth client ID** → **Web application**.
   - Authorised redirect URI: `https://lfbrsfenvhgwzaawuasw.supabase.co/auth/v1/callback`
   - Authorised JavaScript origin: `https://omichatapp.octadevs.fun`
   - Copy the **Client ID** and **Client secret**.

2. **Supabase** → **Authentication** → **Providers** → **Google**.
   - Turn it on.
   - Paste the client ID and secret.
   - Set *Skip Nonce Check* off (leave the box unticked).

> The secret lives only in Supabase and is exchanged server-side. No env var is
> needed and none should be added — see the warning in §1.

**Redirect URLs**

Supabase → **Authentication** → **URL Configuration** → **Redirect URLs**, add:

```
http://localhost:3000/auth/callback
https://omichatapp.octadevs.fun/auth/callback
```

Supabase ignores the `redirect_to` it is given unless that exact URL is on this
list, so a missing entry fails as an opaque redirect error.

Also set **Site URL** to `https://omichatapp.octadevs.fun` (or `http://localhost:3000` while
developing) so that login lands somewhere sensible.

### 2c. Email delivery — do not skip

**Supabase's built-in email service only sends to members of your own project
team**, at roughly 2 messages an hour. A real visitor signing up with
`gmail.com` will simply never receive a code, and the app will look broken for
reasons that are not visible from the front end. From Supabase's docs:

> Unless you configure a custom SMTP server for your project, Supabase Auth will
> refuse to deliver messages to addresses that are not part of the project's team.

So a custom SMTP provider is **required**, not optional. Free tiers that work:
Resend (3,000/mo), Brevo (300/day), Mailgun (sandbox). Supabase ��'
**Project Settings** ��' **Email** ��' paste the host, port, username and password,
then *Save*. Your own address must be verified with the provider first.

Note that Supabase imposes its own ceiling on top of the provider's — 30
emails/hour by default, raised under **Authentication ��' Rate Limits**.

### 2d. Email template: verification code instead of a link

Supabase ��' **Authentication** ��' **Email Templates** ��' **Confirm signup**.

Replace the button that points at `{{ .ConfirmationURL }}` with the code itself,
using `{{ .Token }}` — that variable renders a 6-digit code:

```html
<p>Welcome to Omi Chat. Enter this code to finish setting up your account:</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:700">{{ .Token }}</p>
<p>The code expires in about an hour. If you didn't ask for this, ignore this email.</p>
```

While you are there, the **subject** is a separate field — change it to
something like `Your Omi Chat code is {{ .Token }}`. Some mail clients show the
subject above the body, so a bare "Confirm your email" gives the recipient
nothing to act on.

Two things worth knowing:

- **A code beats a link here.** Corporate and security mail clients
  (Microsoft Safe Links, Proofpoint, some mobile scanners) open links
  automatically to check them. When that happens, a single-use confirmation
  link is consumed before the person ever sees it, and their signup fails with
  an expired-token error. A code has no such problem. This is the main reason
  to prefer OTP over the default.
- **The templates are independent.** Changing *Confirm signup* to a code does not
  affect *Reset password*, which keeps its link. If you later switch password
  reset to a code as well, its template is separate and needs the same edit.

The app side of this is already built: `signUpWithEmail()` returns
`needs_otp` instead of telling the user to check their inbox, and
`SignupForm` renders a six-box code entry with resend and a back link. See
[`src/lib/supabase/auth.ts`](src/lib/supabase/auth.ts) for `verifyEmailOtp()`.

Google sign-in is unaffected — Google verifies the address itself, so those
users never see a code.

---

## 3. How it fits together

The important structural point: **there are no fan-out mirror tables.** The
Firebase Realtime Database tree this replaced had to copy every message into each
member's `userChats/{uid}` node and every call into each member's
`userCalls/{uid}`, because RTDB has no joins and no server-side rules language.
Postgres does, so:

- `touch_chat()` (a trigger) maintains `chats.last_activity`,
  `chats.last_message` and each sender's read cursor on write.
- `get_inbox()` (an RPC) derives each user's chat list at read time.
- `call_ring` is the one small table kept deliberately — it exists purely so
  Realtime can raise the incoming-call UI, and it holds nothing durable.

Access control is Row Level Security rather than a rules file, which means it is
enforced by the database on every single query, including ones this app never
writes.

Two realtime transports, split by what the data is:

| Data | Transport | Why |
| --- | --- | --- |
| messages, chats, members, profiles, calls | `postgres_changes` | durable, must survive a reload |
| typing, live media state, SDP/ICE | Broadcast | ephemeral, high frequency, no reason to persist |

Typing indicators and call signalling used to be database writes — hundreds per
call. They are now pub/sub messages that touch no table at all.

---

## 4. The auth gate

Opening the app takes you straight to sign in, or straight back into your
conversations if you already have a session. There is no landing page in the way.

`src/proxy.ts` runs before any page renders, so an
unauthenticated visitor never sees a frame of the app and a signed-in one never
sees a frame of the login form.

| Route | Signed out | Signed in |
| --- | --- | --- |
| `/` | → `/login` | → `/chat` |
| `/login`, `/signup` | shown | → `/chat` |
| `/chat`, `/settings`, `/call` | → `/login?next=…` | shown |
| `/welcome`, `/about` | shown | shown |
| `/api/*` | passed through | passed through |

Notes:

- `?next=` is set on **every** protected redirect, so a deep link to
  `/settings?tab=privacy` returns the user to exactly that after signing in.
- `next` is validated in `useSafeNext()` — only in-app absolute paths, never
  `//evil.com`.
- The landing page lives at **`/welcome`**, not `/`. `/` is a router. Marketing
  nav, the footer and the logo on the auth screens point there.
- `/settings` and `/call` had **no** guard of their own before this; they relied
  on the components rendering an empty shell.
- API routes are excluded from the gate and must authenticate themselves. Only
  `/api/presence` exists today and it is a no-op sink.

This is convenience and defence in depth, not the security boundary. Every table
has RLS, so a forged cookie buys an attacker a rendered shell and nothing else —
their first query returns zero rows.

---

## 5. Calling notes

- Calls are **1:1 and peer-to-peer**. The caller creates the SDP offer, the
  callee answers — no glare, no renegotiation needed for the basics.
- Signalling rides a Supabase Realtime **Broadcast** channel named
  `call:{id}`, not the database. SDP offers and ICE candidates are never stored.
- Media never touches Supabase. Only the handshake does.
- Default ICE config is Google's public STUN. Behind strict corporate or carrier
  NATs a call will fail to connect without a TURN relay — roughly 10–15% of
  mobile and office networks. Set `NEXT_PUBLIC_TURN_URLS`, e.g.:

  ```
  NEXT_PUBLIC_TURN_URLS=stun:stun.l.google.com:19302,turn:turn.example.com:3478?transport=udp
  ```

  Serve TURN credentials from a short-lived credential endpoint; never ship
  long-lived secrets to the browser.

---

## 6. Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:check` | Parse-validate `supabase/migrations/*.sql` against the Postgres grammar |
| `npm run db:reset` | Reminder to re-apply `supabase/migrations/*.sql` |

`db:check` runs the migration through libpg_query (the same parser Postgres
uses) and reports the tables, functions, policies, indexes and triggers it
creates. Run it after any edit to the SQL. It catches syntax errors, but not
semantic ones — a call to a function that does not still parses, and only the
server rejects it.

---

## 7. Project layout

```
src/
  app/                 routes (landing, auth, chat, call, settings, about, 404)
  components/
    call/              call hub + in-call screen
    chat/              sidebar, conversation, composer, bubbles
    marketing/         landing-page sections
    providers/         auth, settings, call contexts
    settings/          settings view
    ui/                design-system primitives (glass, buttons, fields…)
  hooks/               use-webrtc, use-chat-data
  lib/
    supabase/          the data layer (see below)
    site.ts            brand copy & credits
    types.ts           shared data shapes
  proxy.ts            the auth gate (Next 16's replacement for middleware)
supabase/
  migrations/0001_init.sql   schema, RLS, triggers, storage, RPCs
public/brand/          logo assets
```

`src/lib/supabase/` replaces the old `src/lib/firebase/` and is signature-for-
signature compatible with it, which is why no component changed shape:

| File | Responsibility |
| --- | --- |
| `client.ts` | browser Supabase client singleton |
| `auth.ts` | sign-up, sign-in, Google, password reset, session watch |
| `rows.ts` | Postgres row → UI object adapters; absorbs all type friction |
| `users.ts` | profiles, presence, settings, blocklist, search |
| `chats.ts` | chats, messages, inbox, typing/media broadcast, uploads |
| `calls.ts` | call ring, logs, and the shared WebRTC signalling channel |
| `realtime.ts` | `onTable()`, `openEphemeral()`, `publish()`, `dropChannel()` |

`rows.ts` is the reason nothing above `src/lib` knows Postgres exists.

---

## 8. Deploying the front end

Deployed to **Cloudflare Workers** at <https://omichatapp.octadevs.fun>, using
`@opennextjs/cloudflare`. This app cannot be a static export — `/api/presence`,
`/auth/callback` and `src/proxy.ts` all need a server — so it runs on Workers
rather than a static Pages output.

### Files that make it deployable

| File | Why it exists |
|---|---|
| `wrangler.jsonc` | Worker name, entry point, assets binding, `nodejs_compat` |
| `open-next.config.ts` | Adapter config (defaults are correct; no ISR is used) |
| `.dev.vars` | `NEXTJS_ENV` for `wrangler dev`. No secrets — safe to commit |
| `public/_headers` | Long cache for hashed `/_next/static` assets |

### Local preview

Run in the real Workers runtime rather than Node, so problems show up before
they deploy:

```bash
npm run preview
```

### Deploying

```bash
npm run deploy
```

That builds with `next build`, adapts the output for workerd, and pushes it.
`npm run upload` does the same but leaves it unactivated.

Requires a Cloudflare API token (`npx wrangler login` for an interactive one).
A CI-friendly token needs the **Workers Scripts: Edit** and **Workers Tail**
permissions; add **Account: Read** too if the account id is not in `wrangler.jsonc`.

### Connecting Cloudflare to Git

Workers can build straight from GitHub, but `opennextjs-cloudflare deploy` needs
a token, so set the build command to `npm run build:worker` and let the deploy
step run in CI with a token stored as a secret.

For a Git-connected deploy, Cloudflare's Workers Builds uses:

- **Build command:** `npx opennextjs-cloudflare build`
- **Deploy command:** `npx opennextjs-cloudflare deploy`
- **Root directory:** the folder holding `package.json`

### Environment variables

Every `NEXT_PUBLIC_*` value from `.env` must be set in Cloudflare under
**Settings → Variables and Secrets**. Mark them all **Plaintext**, not Secret:
they are inlined into the client bundle at build time, so Cloudflare cannot keep
them private either way.

`NEXT_PUBLIC_SITE_URL` is `https://omichatapp.octadevs.fun`. Do **not** add
`SUPABASE_SECRET_KEY` — this app has no server-side Supabase calls that need it,
and adding a secret that is not prefixed `NEXT_PUBLIC_` only risks leaking it.

### Free-tier note

Supabase pauses free projects after 7 days with no traffic. "Idle" means real API
traffic — Postgres queries, Realtime connections, Auth calls, Storage calls. A
scheduled job *inside* the database does not reset the clock, so use an external
scheduler (GitHub Actions, cron-job.org) that hits a public route on the app that
touches the database.

---

© Omi Chat. Crafted by **Octa Devs**.