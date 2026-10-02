"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/supabase/client";
import { ensureUserProfile, setPresence, updateUser } from "@/lib/supabase/users";
import { signOut as doSignOut, watchAuth } from "@/lib/supabase/auth";
import { errorMessage } from "@/lib/utils";
import type { OmiUser, PresenceState } from "@/lib/types";

interface AuthContextValue {
  /** true until the Supabase session has been resolved */
  loading: boolean;
  uid: string | null;
  email: string | null;
  profile: OmiUser | null;
  presence: PresenceState;
  error: string | null;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  setStatusText: (text: string) => Promise<void>;
  setChatPinned: (chatId: string, pinned: boolean) => void;
  setChatMuted: (chatId: string, muted: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<OmiUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  /* ── session ────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    setReady(true);

    const unwatch = watchAuth(async (user) => {
      if (!alive) return;

      if (!user) {
        setUid(null);
        setEmail(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUid(user.id);
      setEmail(user.email ?? null);
      try {
        const p = await ensureUserProfile(
          {
            uid: user.id,
            displayName: (user.user_metadata?.display_name as string) ?? null,
            email: user.email ?? null,
            photoURL: (user.user_metadata?.avatar_url as string) ?? null,
          },
          {},
        );
        if (!alive) return;
        setProfile(p);
      } catch (e) {
        if (alive) setError(errorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    });

    return () => {
      alive = false;
      unwatch();
    };
  }, []);

  /* ── presence heartbeat ────────────────────────────────── */
  useEffect(() => {
    if (!uid || !ready) return;

    let disposed = false;

    const goOnline = () => {
      if (disposed) return;
      void setPresence(uid, "online").catch(() => undefined);
    };

    /**
     * Presence is a column on profiles so *other* users can read it, plus a
     * Realtime Presence channel so the local tab updates instantly.
     *
     * The Firebase version used onDisconnect() to clear presence when the
     * socket dropped. Supabase has no equivalent for a table column, so the
     * channel below carries the liveness signal and the column is a
     * best-effort mirror refreshed on every transition and on a slow timer.
     */
    const goAway = () => {
      if (disposed) return;
      const next: PresenceState =
        document.visibilityState === "hidden" ? "away" : "online";
      void setPresence(uid, next).catch(() => undefined);
    };

    const onUnload = () => {
      // Keep the existing beacon endpoint: it is the only thing that can still
      // fire after the page starts tearing down.
      navigator.sendBeacon?.(`${location.origin}/api/presence`);
    };

    goOnline();

    // Realtime presence: presenceSync fires on every join/leave across clients,
    // which is how a peer notices you closed the tab without a DB round trip.
    let channel = getSupabase().channel(`presence:${uid}`, {
      config: { presence: { key: uid } },
    });
    channel.on("presence", { event: "sync" }, () => undefined);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && !disposed) {
        void channel.track({ uid, at: Date.now() });
      }
    });

    // Bug #7 Fix: Re-subscribe the Realtime channel after network recovery.
    // Previously, `window.addEventListener("online", goAway)` would call goAway
    // (which might set away) and the stale Realtime channel would never
    // re-subscribe. Now we explicitly set online AND re-subscribe.
    const onNetworkOnline = () => {
      if (disposed) return;
      goOnline();
      // Re-subscribe the Realtime presence channel after reconnect.
      void getSupabase().removeChannel(channel).then(() => {
        if (disposed) return;
        channel = getSupabase().channel(`presence:${uid}`, {
          config: { presence: { key: uid } },
        });
        channel.on("presence", { event: "sync" }, () => undefined);
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED" && !disposed) {
            void channel.track({ uid, at: Date.now() });
          }
        });
      });
    };

    document.addEventListener("visibilitychange", goAway);
    window.addEventListener("online", onNetworkOnline);
    window.addEventListener("beforeunload", onUnload);
    const heartbeat = setInterval(goAway, 60_000);

    return () => {
      disposed = true;
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", goAway);
      window.removeEventListener("online", onNetworkOnline);
      window.removeEventListener("beforeunload", onUnload);
      void setPresence(uid, "offline").catch(() => undefined);
      void getSupabase().removeChannel(channel);
    };
  }, [uid, ready]);

  /* ── actions ────────────────────────────────────────────── */
  const refreshProfile = useCallback(async () => {
    if (!uid) return;
    const { getUser } = await import("@/lib/supabase/users");
    const fresh = await getUser(uid);
    if (fresh) setProfile(fresh);
  }, [uid]);

  const signOut = useCallback(async () => {
    await doSignOut();
    setUid(null);
    setEmail(null);
    setProfile(null);
  }, []);

  const setStatusText = useCallback(
    async (text: string) => {
      if (!uid) return;
      await updateUser(uid, { statusText: text });
      setProfile((p) => (p ? { ...p, statusText: text } : p));
    },
    [uid],
  );

  const setChatPinned = useCallback((chatId: string, isPinned: boolean) => {
    setProfile((p) => {
      if (!p) return p;
      const nextPins = { ...(p.pinnedChats ?? {}) };
      if (isPinned) nextPins[chatId] = true;
      else delete nextPins[chatId];
      return { ...p, pinnedChats: nextPins };
    });
  }, []);

  const setChatMuted = useCallback((chatId: string, isMuted: boolean) => {
    setProfile((p) => {
      if (!p) return p;
      const nextMutes = { ...(p.mutedChats ?? {}) };
      if (isMuted) nextMutes[chatId] = true;
      else delete nextMutes[chatId];
      return { ...p, mutedChats: nextMutes };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      uid,
      email,
      profile,
      presence: profile?.presence ?? "offline",
      error,
      clearError: () => setError(null),
      refreshProfile,
      signOut,
      setStatusText,
      setChatPinned,
      setChatMuted,
    }),
    [
      loading,
      uid,
      email,
      profile,
      error,
      refreshProfile,
      signOut,
      setStatusText,
      setChatPinned,
      setChatMuted,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
