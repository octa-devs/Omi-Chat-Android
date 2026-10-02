"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  UserRound,
  Palette,
  MessageSquare,
  Bell,
  ShieldCheck,
  LogOut,
  Check,
  Loader2,
  Sparkles,
  Mail,
  AtSign,
  Info,
  CheckCheck,
  Type,
  Volume2,
  Pencil,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Field, Input, Textarea, Switch } from "@/components/ui/field";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { getUser, isUsernameTaken, setBlocked, updateUser } from "@/lib/supabase/users";
import type { OmiUser, UserSettings } from "@/lib/types";
import { cn, errorMessage, usernameProblem } from "@/lib/utils";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
  { id: "account", label: "Account", icon: LogOut },
];

const ACCENT_SWATCHES: Array<{
  value: UserSettings["accent"];
  label: string;
  from: string;
  to: string;
}> = [
  { value: "azure", label: "Azure", from: "#8aaff4", to: "#1c4492" },
  { value: "slate", label: "Slate", from: "#a3aec2", to: "#2c374b" },
  { value: "teal", label: "Teal", from: "#6ad9c4", to: "#0c615a" },
  { value: "gold", label: "Amber", from: "#ffd9a3", to: "#96601a" },
];

const THEMES: Array<{
  value: UserSettings["theme"];
  label: string;
  bg: string;
}> = [
  { value: "aurora", label: "Azure", bg: "linear-gradient(140deg,#dbe8fe,#f4f6fb)" },
  { value: "ember", label: "Amber", bg: "linear-gradient(140deg,#ffe9c9,#f7f3ea)" },
  { value: "mint", label: "Mint", bg: "linear-gradient(140deg,#d8f7f0,#eef7f5)" },
  { value: "noir", label: "Slate", bg: "linear-gradient(140deg,#dde2ec,#eef1f7)" },
];

export function SettingsView() {
  const router = useRouter();
  const { uid, profile, email, loading, signOut, refreshProfile } = useAuth();
  const { settings, set, reset } = useSettings();

  useEffect(() => {
    if (loading) return;
    if (!uid) router.replace(`/login?next=${encodeURIComponent("/settings")}`);
  }, [uid, loading, router]);

  if (loading || (!uid && !profile)) {
    return <PageSkeleton label="Opening settings" />;
  }
  if (!uid || !profile) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-ink-950" />
        <div className="absolute -top-40 left-1/3 size-150 rounded-full bg-brand-200/60 blur-[150px] animate-float-a" />
        <div className="absolute -bottom-40 right-1/4 size-125 rounded-full bg-[#3670dd]/12 blur-[150px] animate-float-b" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-20 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <Link href="/chat" className="transition-opacity hover:opacity-85">
            <Logo size={30} />
          </Link>
          <ButtonLink href="/chat" variant="ghost" size="sm" className="px-3">
            <MessageSquare className="size-4" />
            <span className="hidden sm:inline">Back to chats</span>
          </ButtonLink>
        </header>

        <div className="mt-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[0.66rem] font-semibold tracking-[0.2em] text-brand-600 uppercase">
            <Sparkles className="size-3.5" />
            Settings
          </span>
          <h1 className="mt-5 font-display text-[clamp(2.2rem,6vw,3.4rem)] leading-[1.05] tracking-[-0.02em] text-fg">
            Make it{" "}
            <span className="text-gradient-brand">yours</span>
          </h1>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[13rem_1fr]">
          {/* ── section nav ── */}
          <nav className="hidden lg:block">
            <ul className="sticky top-8 space-y-1">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm text-fg-2 transition-colors hover:bg-fg/6 hover:text-fg"
                  >
                    <Icon className="size-4 text-brand-600" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-8">
            <ProfileSection profile={profile} onSaved={refreshProfile} />
            <AppearanceSection settings={settings} set={set} onReset={reset} />
            <ChatSection settings={settings} set={set} />
            <NotificationsSection settings={settings} set={set} />
            <PrivacySection profile={profile} onChanged={refreshProfile} />
            <AccountSection
              email={email}
              profile={profile}
              onSignOut={async () => {
                await signOut();
                router.replace("/login");
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/* ── profile ─────────────────────────────────────────────────── */

function ProfileSection({
  profile,
  onSaved,
}: {
  profile: OmiUser;
  onSaved: () => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [statusText, setStatusText] = useState(profile.statusText ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setStatusText(profile.statusText ?? "");
    setBio(profile.bio ?? "");
  }, [profile]);

  const usernameError = useMemo(() => {
    const v = username.trim().toLowerCase();
    if (v === profile.username) return null;
    return usernameProblem(v);
  }, [username, profile.username]);

  const dirty =
    displayName !== profile.displayName ||
    username.trim().toLowerCase() !== profile.username ||
    statusText !== (profile.statusText ?? "") ||
    bio !== (profile.bio ?? "");

  const save = async () => {
    if (!profile.uid) return;
    const uname = username.trim().toLowerCase();
    const problem = usernameProblem(uname);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      if (uname !== profile.username && (await isUsernameTaken(uname))) {
        toast.error("That @username is already taken.");
        return;
      }
      await updateUser(profile.uid, {
        displayName: displayName.trim() || "Omi user",
        username: uname,
        statusText: statusText.trim(),
        bio: bio.trim(),
      });
      await onSaved();
      toast.success("Profile saved");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section id="profile" icon={UserRound} title="Profile" body="How people see you across Omi Chat.">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar
          id={profile.uid}
          name={displayName}
          src={profile.avatarUrl}
          size="xl"
          presence={profile.presence}
          ring
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl leading-tight text-fg">
            {displayName || "Omi user"}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-fg-3">
            <AtSign className="size-3.5" />
            {username || "username"}
          </p>
          <p className="mt-3 text-xs text-fg-3">
            Avatar syncing from your sign-in provider is coming soon.
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Display name">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={48}
          />
        </Field>
        <Field
          label="Username"
          error={usernameError}
          success={Boolean(username) && !usernameError && username.trim().toLowerCase() !== profile.username}
        >
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            icon={<AtSign className="size-4" />}
            invalid={Boolean(usernameError)}
            maxLength={20}
            autoCapitalize="none"
          />
        </Field>
      </div>

      <Field className="mt-5" label="Status" hint="Shown beside your name">
        <Input
          value={statusText}
          onChange={(e) => setStatusText(e.target.value)}
          placeholder="Available for a chat…"
          icon={<Pencil className="size-4" />}
          maxLength={64}
        />
      </Field>

      <Field className="mt-5" label="About you" hint={`${bio.length}/200`}>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 200))}
          placeholder="A line or two about yourself."
        />
      </Field>

      <div className="mt-6 flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-fg-3">Unsaved changes</span>}
        <Button onClick={() => void save()} loading={saving} disabled={!dirty}>
          {!saving && <Check className="size-4" />}
          Save profile
        </Button>
      </div>
    </Section>
  );
}

/* ── appearance ──────────────────────────────────────────────── */

function AppearanceSection({
  settings,
  set,
  onReset,
}: {
  settings: UserSettings;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  onReset: () => void;
}) {
  return (
    <Section
      id="appearance"
      icon={Palette}
      title="Appearance"
      body="Accent colour and ambient theme apply instantly and sync to your account."
      action={
        <button
          onClick={onReset}
          className="text-xs text-fg-3 underline-offset-4 transition-colors hover:text-fg hover:underline"
        >
          Reset to defaults
        </button>
      }
    >
      {/* accent */}
      <div>
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-fg-2 uppercase">
          Accent
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {ACCENT_SWATCHES.map((s) => {
            const active = settings.accent === s.value;
            return (
              <button
                key={s.value}
                onClick={() => set("accent", s.value)}
                aria-pressed={active}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all duration-300",
                  active
                    ? "border-brand-300 bg-brand-50"
                    : "border-fg/10 bg-white hover:border-brand-300",
                )}
              >
                <span
                  className="size-7 rounded-full ring-1 ring-fg/20"
                  style={{ background: `linear-gradient(140deg,${s.from},${s.to})` }}
                />
                <span className="text-sm text-fg group-hover:text-fg">
                  {s.label}
                </span>
                {active && <Check className="size-3.5 text-mint-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* theme */}
      <div className="mt-8">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-fg-2 uppercase">
          Theme
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEMES.map((t) => {
            const active = settings.theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => set("theme", t.value)}
                aria-pressed={active}
                className={cn(
                  "overflow-hidden rounded-2xl border text-left transition-all duration-300",
                  active ? "border-brand-300" : "border-fg/10 hover:border-brand-300",
                )}
              >
                <span className="block h-16 w-full" style={{ background: t.bg }} />
                <span className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-sm text-fg">{t.label}</span>
                  {active && <Check className="size-3.5 text-mint-600" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 border-t border-fg/8 pt-2">
        <Switch
          checked={settings.compactMode}
          onChange={(v) => set("compactMode", v)}
          label="Compact mode"
          description="Tighter spacing in lists and conversations."
          icon={<Type className="size-4" />}
        />
      </div>
    </Section>
  );
}

/* ── chat ────────────────────────────────────────────────────── */

function ChatSection({
  settings,
  set,
}: {
  settings: UserSettings;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}) {
  return (
    <Section id="chat" icon={MessageSquare} title="Chat" body="Control how conversations behave.">
      <Switch
        checked={settings.enterToSend}
        onChange={(v) => set("enterToSend", v)}
        label="Send with Enter"
        description="When off, Enter adds a new line and ⌘/Ctrl + Enter sends."
        icon={<MessageSquare className="size-4" />}
      />
      <Switch
        checked={settings.typingIndicator}
        onChange={(v) => set("typingIndicator", v)}
        label="Typing indicators"
        description="Let people see when you are composing a message."
        icon={<Pencil className="size-4" />}
      />
      <Switch
        checked={settings.readReceipts}
        onChange={(v) => set("readReceipts", v)}
        label="Read receipts"
        description="Share when you have read a message."
        icon={<CheckCheck className="size-4" />}
      />
      <Switch
        checked={settings.messageSounds}
        onChange={(v) => set("messageSounds", v)}
        label="Message sounds"
        description="Play a soft chime for new messages and calls."
        icon={<Volume2 className="size-4" />}
      />
    </Section>
  );
}

/* ── notifications ───────────────────────────────────────────── */

function NotificationsSection({
  settings,
  set,
}: {
  settings: UserSettings;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}) {
  const toggle = async (v: boolean) => {
    if (
      v &&
      typeof Notification !== "undefined" &&
      Notification.permission !== "granted"
    ) {
      const result = await Notification.requestPermission().catch(
        () => "denied" as NotificationPermission,
      );
      if (result !== "granted") {
        toast.error("Notifications are blocked in your browser settings.");
        return;
      }
    }
    set("desktopNotifications", v);
  };

  const permission =
    typeof Notification !== "undefined" ? Notification.permission : "default";

  return (
    <Section id="notifications" icon={Bell} title="Notifications">
      <Switch
        checked={settings.desktopNotifications}
        onChange={(v) => void toggle(v)}
        label="Desktop notifications"
        description={
          permission === "denied"
            ? "Blocked by your browser — enable them in site settings."
            : "Show a system notification when a message arrives while Omi is in the background."
        }
        icon={<Bell className="size-4" />}
      />
      <div className="mt-2 flex items-start gap-3 rounded-2xl border border-fg/10 bg-ink-800 px-4 py-3.5">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
        <p className="text-xs leading-relaxed text-fg-2">
          Sounds and notifications are always suppressed while you are focused on
          the app, so you are only interrupted when you actually need to be.
        </p>
      </div>
    </Section>
  );
}

/* ── privacy ─────────────────────────────────────────────────── */

function PrivacySection({
  profile,
  onChanged,
}: {
  profile: OmiUser;
  onChanged: () => Promise<void>;
}) {
  const blockedIds = useMemo(
    () => Object.keys(profile.blocked ?? {}).filter((k) => profile.blocked?.[k]),
    [profile.blocked],
  );
  const [people, setPeople] = useState<Record<string, OmiUser>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!blockedIds.length) {
      setPeople({});
      return;
    }
    setLoading(true);
    void Promise.all(blockedIds.map((id) => getUser(id)))
      .then((users) => {
        if (!alive) return;
        const map: Record<string, OmiUser> = {};
        for (const u of users) if (u) map[u.uid] = u;
        setPeople(map);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [blockedIds]);

  const unblock = async (id: string) => {
    await setBlocked(profile.uid, id, false).catch(() => undefined);
    await onChanged();
    toast.success("User unblocked");
  };

  return (
    <Section
      id="privacy"
      icon={ShieldCheck}
      title="Privacy & safety"
      body="Blocked people cannot message you or start a call with you."
    >
      {loading ? (
        <div className="flex items-center gap-3 py-3 text-sm text-fg-3">
          <Loader2 className="size-4 animate-spin" />
          Loading blocked accounts…
        </div>
      ) : blockedIds.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-fg/10 bg-ink-800 px-4 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-ink-800 text-fg-3">
            <UserX className="size-4" />
          </span>
          <p className="text-sm text-fg-2">
            You have not blocked anyone.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {blockedIds.map((id) => {
            const u = people[id];
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-fg/10 bg-ink-800 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar id={id} name={u?.displayName ?? "Blocked user"} src={u?.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">
                      {u?.displayName ?? "Unknown user"}
                    </p>
                    {u?.username && (
                      <p className="truncate text-xs text-fg-3">@{u.username}</p>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => void unblock(id)}>
                  Unblock
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/* ── account ─────────────────────────────────────────────────── */

function AccountSection({
  email,
  profile,
  onSignOut,
}: {
  email: string | null;
  profile: OmiUser;
  onSignOut: () => Promise<void>;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const memberSince = new Date(profile.createdAt).toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  return (
    <Section id="account" icon={LogOut} title="Account">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-ink-800 text-fg-2">
            <Mail className="size-4.5" />
          </span>
          <div>
            <p className="text-sm text-fg">{email ?? "No email on file"}</p>
            <p className="text-xs text-fg-3">Member since {memberSince}</p>
          </div>
        </div>
        <ButtonLink href="/about#developers" variant="ghost" size="sm">
          <Info className="size-4" />
          About Octa Devs
        </ButtonLink>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-fg/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-fg">Sign out of Omi Chat</p>
          <p className="text-xs text-fg-3">
            You can sign back in any time with the same account.
          </p>
        </div>
        <Button
          variant="danger"
          loading={signingOut}
          onClick={async () => {
            setSigningOut(true);
            await onSignOut();
          }}
        >
          {!signingOut && <LogOut className="size-4" />}
          Sign out
        </Button>
      </div>
    </Section>
  );
}

/* ── shared shell ────────────────────────────────────────────── */

function Section({
  id,
  icon: Icon,
  title,
  body,
  action,
  children,
}: {
  id: string;
  icon: typeof UserRound;
  title: string;
  body?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="glass glass-sheen grain scroll-mt-8 rounded-4xl p-6 sm:p-8"
    >
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-fg/10 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-brand-500)_26%,transparent),transparent)] text-brand-600">
            <Icon className="size-4.5" />
          </span>
          <div>
            <h2 className="font-display text-2xl leading-tight text-fg">{title}</h2>
            {body && <p className="mt-1 text-sm text-fg-3">{body}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="border-t border-fg/8 pt-2">{children}</div>
    </motion.section>
  );
}
