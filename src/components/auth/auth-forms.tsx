"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  AtSign,
  Check,
  CircleAlert,
  KeyRound,
  Lock,
  Mail,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  resendVerification,
  sendReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  verifyEmailOtp,
} from "@/lib/supabase/auth";
import {
  EMAIL_RE,
  errorMessage,
  passwordProblem,
  usernameProblem,
} from "@/lib/utils";
import { SITE } from "@/lib/site";

/* ── shared bits ──────────────────────────────────────────── */

function useSafeNext() {
  const params = useSearchParams();
  return useMemo(() => {
    const raw = params.get("next");
    // Only ever redirect to an in-app path — never an open redirect.
    if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/chat";
    return raw;
  }, [params]);
}

/** Bounce away if a session already exists. */
function useRedirectIfSignedIn() {
  const { uid, loading } = useAuth();
  const router = useRouter();
  const next = useSafeNext();
  useEffect(() => {
    if (!loading && uid) router.replace(next);
  }, [uid, loading, router, next]);
}

/**
 * Surface an OAuth failure on arrival.
 *
 * The /auth/callback route has nowhere useful to render an error of its own, so
 * it redirects here with ?error=... . Read once on mount and then scrubbed from
 * the URL, so a refresh does not replay the same failure.
 *
 * @returns the message, or null.
 */
function useLandingError(): string | null {
  const params = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const raw = params.get("error");
    if (!raw) return;

    setMessage(
      errorMessage(new Error(raw.replace(/\+/g, " "))) ||
        "Something went wrong signing you in.",
    );

    // Scrub it: otherwise the message survives a refresh and reappears.
    const clean = new URLSearchParams(params.toString());
    clean.delete("error");
    const qs = clean.toString();
    router.replace(qs ? `${location.pathname}?${qs}` : location.pathname);
  }, [params, router]);

  return message;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.6h11.9c-.2 2-1.5 5-4.4 7l-.04.26 6.4 4.9.44.04C42.8 35.9 45.1 30.7 45.1 24.5Z"
      />
      <path
        fill="#34A853"
        d="M24 46c3.2 0 5.9-1.06 7.9-2.9l-3.8-2.9c-1 .72-2.37 1.2-4.1 1.2-3.1 0-5.8-2.05-6.7-4.9l-.24.02-6.66 5.1-.09.23A22 22 0 0 0 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M17.3 36.5a13.5 13.5 0 0 1-.73-4.5c0-1.57.27-3.09.73-4.5l-.01-.3-6.74-5.17-.22.1A22 22 0 0 0 2 32c0 3.55.86 6.9 2.33 9.87l6.97-5.37Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.6c2.2 0 3.7.95 4.55 1.74l3.32-3.24C29.9 7.3 27.2 5.8 24 5.8A22 22 0 0 0 4.33 22.13l6.97 5.37c.9-2.85 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}

function GoogleButton({
  onDone,
  label,
}: {
  onDone: () => void;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="glass"
      size="lg"
      block
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          // This is a full-page redirect, not a popup: signInWithOAuth sends the
          // tab to Google, Google returns to /auth/callback, that route trades
          // the PKCE code for a session and redirects to /chat. There is no
          // success state in this tab to report, so onDone() is deliberately
          // not called — it only runs if the redirect is blocked.
          await signInWithGoogle();
          toast.loading("Redirecting to Google…");
          onDone();
        } catch (e) {
          setBusy(false);
          toast.error(errorMessage(e));
        }
      }}
    >
      {!busy && <GoogleMark />}
      {label}
    </Button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-4 py-1">
      <span className="hairline flex-1" />
      <span className="text-[0.65rem] font-semibold tracking-[0.22em] text-fg-3 uppercase">
        or
      </span>
      <span className="hairline flex-1" />
    </div>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="glass-strong glass-sheen grain rounded-4xl p-7 sm:p-9"
    >
      {children}
    </motion.div>
  );
}

/* ── the code step ────────────────────────────────────────── */

/**
 * Length of the emailed verification code.
 *
 * This duplicates a GoTrue setting (`GOTRUE_MAILER_OTP_LENGTH`) that the browser
 * cannot read, so it has to be written down here. Keep it in step with
 * Authentication -> Sign In / Providers -> Email in the Supabase dashboard.
 */
const OTP_LENGTH = 8;

/**
 * Shortest value we will attempt to verify.
 *
 * Deliberately looser than OTP_LENGTH. If the dashboard setting is ever changed
 * and this constant is not, an exact-match check would reject every code a real
 * user pastes in — they would type a code that is visibly correct and be told it
 * is wrong, with no way to tell what went wrong. Accepting a range costs nothing
 * because the server is the real check either way: a code of the wrong length
 * simply fails to verify.
 */
const OTP_MIN = 6;

const otpComplete = (value: string) =>
  value.length >= OTP_MIN && value.length <= OTP_LENGTH;

/**
 * Email-confirmation code entry.
 *
 * Shared by sign-up and sign-in, and that sharing is the point. Removing the
 * confirmation link creates a dead-end: someone who starts signing up, closes
 * the tab before typing the code, then arrives at /login is refused with
 * "Email not confirmed" — and with no link-based flow left, nowhere at all to
 * type the code. So sign-in can hand them straight to this component and
 * re-send on the way in.
 */
function CodeStep({
  email,
  subtitle,
  displayName,
  redirectTo,
  onBack,
  backLabel,
}: {
  email: string;
  subtitle: string;
  displayName?: string;
  redirectTo: string;
  onBack: () => void;
  backLabel: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Self-scheduling timeout rather than an interval, so an unmount mid-countdown
  // cannot leave a timer firing into a dead component.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  /** Digits only, capped at 6. A pasted "Your code is 482913" still works. */
  const read = (raw: string) => {
    setError(null);
    setCode(raw.replace(/\D/g, "").slice(0, OTP_LENGTH));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpComplete(code)) return;

    setBusy(true);
    setError(null);
    try {
      await verifyEmailOtp({ email, token: code, displayName });
      const first = displayName?.trim().split(" ")[0];
      toast.success(first ? `Welcome to Omi Chat, ${first}!` : "You're verified.");
      router.replace(redirectTo);
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || resendBusy) return;

    setResendBusy(true);
    setError(null);
    try {
      await resendVerification(email);
      setCode("");
      setResendIn(45);
      toast.success("Sent a fresh code.");
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <FormCard>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-3 transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        {backLabel}
      </button>

      <header className="mb-8">
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">
          <KeyRound className="size-6" />
        </div>
        <h1 className="font-display text-4xl leading-tight text-fg">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-fg-2">
          We sent a {OTP_LENGTH}-digit code to{" "}
          <span className="font-medium break-all text-fg">{email}</span>.{" "}
          {subtitle}
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Verification code" hint={`${OTP_LENGTH} digits`}>
          <Input
            // Lets iOS and Android offer the code above the keyboard.
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={OTP_LENGTH}
            placeholder={"0".repeat(OTP_LENGTH)}
            // No icon: centred text with a left-side icon reads misaligned. The
            // left padding cancels the trailing letter-space browsers add after
            // the final digit, which would otherwise shift the run left of centre.
            className="text-center font-mono text-2xl tracking-[0.45em] pl-[0.45em]"
            value={code}
            onChange={(e) => read(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              read(e.clipboardData.getData("text"));
            }}
            autoFocus
            invalid={Boolean(error)}
          />
        </Field>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2.5 rounded-2xl border border-rust-200 bg-rust-100 px-4 py-3 text-sm text-rust-600">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button type="submit" size="lg" block loading={busy} disabled={!otpComplete(code)}>
          {busy ? "Verifying…" : "Verify and continue"}
        </Button>
      </form>

      <div className="mt-7 text-center">
        <button
          type="button"
          onClick={resend}
          disabled={resendIn > 0 || resendBusy}
          className="text-sm text-fg-3 underline-offset-4 transition-colors hover:text-fg hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline"
        >
          {resendIn > 0
            ? `Didn't get it? Resend in ${resendIn}s`
            : resendBusy
              ? "Sending…"
              : "Didn't get it? Send a new code"}
        </button>
      </div>

      <p className="mt-8 text-center text-[0.7rem] leading-relaxed text-fg-3">
        The code expires in about an hour. Check your spam folder if it
        hasn&apos;t arrived. Questions?{" "}
        <a
          href={`mailto:${SITE.dev.supportEmail}`}
          className="text-fg-2 underline-offset-4 hover:underline"
        >
          {SITE.dev.supportEmail}
        </a>
      </p>
    </FormCard>
  );
}

/* ── login ────────────────────────────────────────────────── */

export function LoginForm() {
  const router = useRouter();
  const next = useSafeNext();
  useRedirectIfSignedIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  // Set when the password was right but the address was never confirmed — the
  // abandoned-signup case. Swaps this form for the code entry and re-sends on
  // the way in, so the person is not left with a correct password and no way
  // forward.
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);

  // An OAuth failure that landed back on this page.
  const landingError = useLandingError();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");

    setBusy(true);
    try {
      await signInWithEmail({ email: email.trim(), password, remember });
      toast.success("Welcome back");
      router.replace(next);
    } catch (err) {
      // Checked against the raw error, before errorMessage() rewrites it into
      // friendly copy. Supabase signals this as code "email_not_confirmed", with
      // "Email not confirmed" as the message on older responses.
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code: string }).code)
          : "";
      const raw = err instanceof Error ? err.message : "";
      const needsCode =
        code === "email_not_confirmed" || /email not confirmed/i.test(raw);

      if (needsCode) {
        setError(null);
        setUnconfirmed(email.trim());
        // Best effort. If this send fails the code screen still has its own
        // resend button, so the failure is not worth interrupting the flow for.
        try {
          await resendVerification(email.trim());
        } catch {
          /* the resend button on the next screen covers this */
        }
        return;
      }

      const msg = errorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (unconfirmed) {
    return (
      <CodeStep
        email={unconfirmed}
        subtitle="Enter it below to finish verifying your account, then we'll sign you in."
        redirectTo={next}
        backLabel="Back to sign in"
        onBack={() => {
          setUnconfirmed(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <FormCard>
      <header className="mb-8">
        <h1 className="font-display text-4xl leading-tight text-fg">Welcome back</h1>
        <p className="mt-2 text-sm text-fg-2">
          Sign in to pick up where you left off.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            icon={<Mail className="size-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(error)}
            required
          />
        </Field>

        <Field
          label="Password"
          trailing={
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="text-xs text-brand-600 underline-offset-4 transition-colors hover:text-brand-700 hover:underline"
            >
              Forgot?
            </button>
          }
        >
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            icon={<Lock className="size-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(error)}
            required
          />
        </Field>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2.5 rounded-2xl border border-rust-200 bg-rust-100 px-4 py-3 text-sm text-rust-600">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                {error ?? landingError}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="-mt-1">
          <Switch
            checked={remember}
            onChange={setRemember}
            label="Keep me signed in"
            description="Stay signed in on this device for 30 days."
          />
        </div>

        <Button type="submit" size="lg" block loading={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-7 space-y-5">
        <Divider />
        <GoogleButton label="Continue with Google" onDone={() => router.replace(next)} />
      </div>

      <p className="mt-8 text-center text-sm text-fg-3">
        New to Omi Chat?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand-600 underline-offset-4 transition-colors hover:text-brand-700 hover:underline"
        >
          Create an account
        </Link>
      </p>

      <ResetPasswordModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        defaultEmail={email}
      />
    </FormCard>
  );
}

function ResetPasswordModal({
  open,
  onClose,
  defaultEmail,
}: {
  open: boolean;
  onClose: () => void;
  defaultEmail: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail);
      setSent(false);
    }
  }, [open, defaultEmail]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reset your password"
      description="We'll email you a secure link to choose a new one."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              if (!EMAIL_RE.test(email.trim())) {
                toast.error("Enter a valid email address.");
                return;
              }
              setBusy(true);
              try {
                await sendReset(email.trim());
                setSent(true);
                toast.success("Reset link sent — check your inbox.");
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Send link
          </Button>
        </>
      }
    >
      {sent ? (
        <div className="flex items-start gap-3 rounded-2xl border border-mint-200 bg-mint-100 px-4 py-3.5 text-sm text-mint-600">
          <Check className="mt-0.5 size-4 shrink-0" />
          <span>
            A password reset link is on its way to <strong>{email}</strong>. Check
            your spam folder if it hasn&apos;t arrived in a couple of minutes.
          </span>
        </div>
      ) : (
        <Field label="Email">
          <Input
            type="email"
            autoFocus
            placeholder="you@example.com"
            icon={<Mail className="size-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      )}
    </Modal>
  );
}

/* ── signup ───────────────────────────────────────────────── */

type UsernameState = "idle" | "checking" | "free" | "taken";

export function SignupForm() {
  const router = useRouter();
  useRedirectIfSignedIn();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameState, setUsernameState] = useState<UsernameState>("idle");

  /* Email-confirmation step.
   *
   * Held separately from the form fields because the account already exists by
   * the time this renders — the profile row and the @username were written by
   * the trigger at signUp time. Going "back" to edit the email would mean
   * signing up again, so the only escape is an explicit abandon.
   *
   * `pending` being non-null IS the stage: no separate flag to keep in sync.
   */
  const [pending, setPending] = useState<{
    email: string;
    displayName: string;
  } | null>(null);

  const usernameErr = username ? usernameProblem(username) : null;
  const passwordErr = password ? passwordProblem(password) : null;
  const confirmErr =
    confirm && password && confirm !== password ? "Passwords don't match." : null;

  /**
   * Debounced availability probe.
   *
   * Advisory only. The UNIQUE constraint on profiles.username is what actually
   * prevents a duplicate, so this just avoids showing the error after the fact.
   */
  const checkUsername = useCallback(async (value: string) => {
    if (usernameProblem(value)) return;
    setUsernameState("checking");
    try {
      const { isUsernameTaken } = await import("@/lib/supabase/users");
      setUsernameState((await isUsernameTaken(value)) ? "taken" : "free");
    } catch {
      setUsernameState("idle");
    }
  }, []);

  useEffect(() => {
    if (!username || usernameProblem(username)) {
      setUsernameState("idle");
      return;
    }
    const t = setTimeout(() => void checkUsername(username), 450);
    return () => clearTimeout(t);
  }, [username, checkUsername]);

  const strength = useMemo(() => passwordStrength(password), [password]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) return setError("Tell us what to call you.");
    const uErr = usernameProblem(username);
    if (uErr) return setError(uErr);
    if (usernameState === "taken") return setError("That @username is already taken.");
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email address.");
    const pErr = passwordProblem(password);
    if (pErr) return setError(pErr);
    if (password !== confirm) return setError("Passwords don't match.");
    if (!accepted) return setError("Please accept the terms to continue.");

    setBusy(true);
    try {
      const outcome = await signUpWithEmail({
        email: email.trim(),
        password,
        username,
        displayName: displayName.trim(),
        remember: true,
      });

      // Confirmation disabled on the project: straight in, no code to type.
      if (outcome.status === "signed_in") {
        toast.success(
          `Welcome to Omi Chat, ${displayName.trim().split(" ")[0]}!`,
        );
        router.replace("/chat");
        return;
      }

      // Confirmation on: the account exists but is unverified. Ask for the code
      // rather than bouncing to /login and making them hunt for an email.
      setPending({ email: outcome.email, displayName: displayName.trim() });
      toast.success(`Check your inbox for a ${OTP_LENGTH}-digit code.`);
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      toast.error(msg);
      // No cleanup needed: the handle is only reserved by a pre-flight read, and
      // the UNIQUE constraint is the real guard. Nothing was written on failure.
    } finally {
      setBusy(false);
    }
  };

  /** Abandon the half-made account. The fields are cleared because they still
   *  hold the values that were already sent to the server, and the account is
   *  now taken — typing the same email again would fail as "already registered". */
  const abandon = () => {
    setPending(null);
    setError(null);
    setDisplayName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirm("");
    setUsernameState("idle");
  };

  /* step 2: the emailed code */

  if (pending) {
    return (
      <CodeStep
        email={pending.email}
        displayName={pending.displayName}
        subtitle="Enter it below to finish setting up your account."
        redirectTo="/chat"
        backLabel="Use a different email"
        onBack={abandon}
      />
    );
  }
  return (
    <FormCard>
      <header className="mb-8">
        <h1 className="font-display text-4xl leading-tight text-fg">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-fg-2">
          Free forever. No card, no phone number.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Display name">
          <Input
            autoComplete="name"
            placeholder="Aarav Mehta"
            icon={<User className="size-4" />}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </Field>

        <Field
          label="Username"
          hint="lowercase, numbers, _"
          error={usernameErr}
          success={usernameState === "free"}
          trailing={
            usernameState === "checking" ? (
              <Spinner className="size-3.5 border-fg/20 border-t-brand-300" />
            ) : usernameState === "free" ? (
              <Check className="size-4 text-mint-600" />
            ) : usernameState === "taken" ? (
              <X className="size-4 text-rust-600" />
            ) : null
          }
        >
          <Input
            autoComplete="username"
            placeholder="aarav"
            icon={<AtSign className="size-4" />}
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))
            }
            invalid={Boolean(usernameErr) || usernameState === "taken"}
          />
        </Field>
        {usernameState === "taken" && !usernameErr && (
          <p className="-mt-3 text-xs text-rust-600">
            @{username} is taken — try another.
          </p>
        )}

        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            icon={<Mail className="size-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field label="Password" error={passwordErr}>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            icon={<Lock className="size-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(passwordErr)}
            required
          />
        </Field>

        {password && (
          <div className="-mt-3 flex items-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                animate={{
                  backgroundColor:
                    i < strength.score ? strength.color : "rgba(255,255,255,0.7)",
                }}
                className="h-1 flex-1 rounded-full"
              />
            ))}
            <span className="w-16 text-right text-[0.68rem] text-fg-3">
              {strength.label}
            </span>
          </div>
        )}

        <Field label="Confirm password" error={confirmErr}>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            icon={<Lock className="size-4" />}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            invalid={Boolean(confirmErr)}
            required
          />
        </Field>

        <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm text-fg-2">
          <button
            type="button"
            role="checkbox"
            aria-checked={accepted}
            onClick={() => setAccepted((v) => !v)}
            className={
              accepted
                ? "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-[linear-gradient(120deg,var(--color-brand-500),var(--color-brand-700))] text-on-accent"
                : "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-fg/18 bg-fg/5 text-transparent"
            }
          >
            <Check className="size-3.5" />
          </button>
          <span className="leading-relaxed">
            I agree to the{" "}
            <Link
              href="/terms"
              className="text-fg underline underline-offset-4 hover:text-brand-700"
            >
              Terms of Service
            </Link>{" "}
            and the{" "}
            <Link
              href="/privacy"
              className="text-fg underline underline-offset-4 hover:text-brand-700"
            >
              Privacy Policy
            </Link>
            , and to keep Omi Chat a kind place.
          </span>
        </label>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2.5 rounded-2xl border border-rust-200 bg-rust-100 px-4 py-3 text-sm text-rust-600">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button type="submit" size="lg" block loading={busy}>
          {busy ? "Creating your account…" : (
            <>
              <Sparkles className="size-4" />
              Create account
            </>
          )}
        </Button>
      </form>

      <div className="mt-7 space-y-5">
        <Divider />
        <GoogleButton label="Sign up with Google" onDone={() => router.replace("/chat")} />
      </div>

      <p className="mt-8 text-center text-sm text-fg-3">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-600 underline-offset-4 transition-colors hover:text-brand-700 hover:underline"
        >
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-[0.7rem] leading-relaxed text-fg-3">
        By continuing you accept our{" "}
        <Link
          href="/terms"
          className="text-fg-2 underline underline-offset-4 transition-colors hover:text-fg"
        >
          fair-use terms
        </Link>
        . Questions?{" "}
        <a
          href={`mailto:${SITE.dev.supportEmail}`}
          className="text-fg-2 underline-offset-4 hover:underline"
        >
          {SITE.dev.supportEmail}
        </a>
      </p>
    </FormCard>
  );
}

function passwordStrength(value: string) {
  let score = 0;
  if (value.length >= 6) score++;
  if (value.length >= 10) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) || /[^\w\s]/.test(value)) score++;
  const levels = [
    { label: "weak", color: "#ff7a8a" },
    { label: "fair", color: "#ffc97b" },
    { label: "good", color: "#a684ff" },
    { label: "strong", color: "#5eead4" },
  ];
  return { score, ...levels[Math.max(0, score - 1)] };
}
