import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { getSupabase } from "@/lib/supabase/client";
import { ensureUserProfile, setPresence, updateUser } from "@/lib/supabase/users";
import {
  signOut as doSignOut,
  watchAuth,
  signInWithEmail as doSignInWithEmail,
  signUpWithEmail as doSignUpWithEmail,
} from "@/lib/supabase/auth";
import { signInWithGoogle as doSignInWithGoogle } from "@/lib/supabase/oauth";
import { errorMessage } from "@/lib/utils";
import type { OmiUser, PresenceState } from "@/lib/types";

export interface SimpleUser {
  id: string;
  email: string | null;
  displayName: string | null;
  username?: string;
  avatarUrl: string | null;
}

interface AuthContextValue {
  loading: boolean;
  uid: string | null;
  email: string | null;
  profile: OmiUser | null;
  user: SimpleUser | null;
  presence: PresenceState;
  error: string | null;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Omit<OmiUser, "uid">>) => Promise<void>;
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (input: { email: string; password: string; displayName?: string; username?: string }) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
  setStatusText: (text: string) => Promise<void>;
  setChatPinned: (chatId: string, pinned: boolean) => void;
  setChatMuted: (chatId: string, muted: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const HEARTBEAT_MS = 25_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<OmiUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = !ready;

  useEffect(() => {
    let alive = true;

    const unwatch = watchAuth(async (user) => {
      if (!alive) return;

      if (!user) {
        setUid(null);
        setEmail(null);
        setProfile(null);
        setReady(true);
        return;
      }

      setUid(user.id);
      setEmail(user.email ?? null);

      try {
        const prof = await ensureUserProfile(
          {
            uid: user.id,
            displayName: (user.user_metadata?.full_name as string | undefined) ?? null,
            email: user.email ?? null,
            photoURL: (user.user_metadata?.avatar_url as string | undefined) ?? null,
          },
          {},
        );
        if (alive) {
          setProfile(prof);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(errorMessage(e));
      } finally {
        if (alive) setReady(true);
      }
    });

    return () => {
      alive = false;
      unwatch();
    };
  }, []);

  useEffect(() => {
    if (!uid || !ready) return;

    let disposed = false;
    let channel = getSupabase().channel(`presence:${uid}`, {
      config: { presence: { key: uid } },
    });

    const goOnline = () => {
      if (disposed) return;
      void setPresence(uid, "online").catch(() => undefined);
    };

    const goAway = () => {
      if (disposed) return;
      void setPresence(uid, "away").catch(() => undefined);
    };

    const trackChannel = (ch: any) => {
      ch.on("presence", { event: "sync" }, () => undefined);
      ch.subscribe((status: string) => {
        if (status === "SUBSCRIBED" && !disposed) {
          void ch.track({ uid, at: Date.now() });
        }
      });
    };

    goOnline();
    trackChannel(channel);

    let wasBackgrounded = false;

    const onAppState = (state: AppStateStatus) => {
      if (disposed) return;

      if (state === "active") {
        if (!wasBackgrounded) return;
        wasBackgrounded = false;
        goOnline();
        void getSupabase()
          .removeChannel(channel)
          .then(() => {
            if (disposed) return;
            channel = getSupabase().channel(`presence:${uid}`, {
              config: { presence: { key: uid } },
            });
            trackChannel(channel);
          })
          .catch(() => undefined);
        return;
      }

      if (state === "background" || state === "inactive") {
        wasBackgrounded = true;
        goAway();
      }
    };

    const sub = AppState.addEventListener("change", onAppState);
    const heartbeat = setInterval(() => {
      if (AppState.currentState === "active") goOnline();
      else goAway();
    }, HEARTBEAT_MS);

    return () => {
      disposed = true;
      clearInterval(heartbeat);
      sub.remove();
      void setPresence(uid, "offline").catch(() => undefined);
      void getSupabase().removeChannel(channel);
    };
  }, [uid, ready]);

  const refreshProfile = useCallback(async () => {
    if (!uid) return;
    const { getUser } = await import("@/lib/supabase/users");
    const fresh = await getUser(uid);
    if (fresh) setProfile(fresh);
  }, [uid]);

  const updateProfile = useCallback(
    async (patch: Partial<Omit<OmiUser, "uid">>) => {
      if (!uid) return;
      await updateUser(uid, patch);
      await refreshProfile();
    },
    [uid, refreshProfile],
  );

  const signIn = useCallback(async (emailInput: string, pass: string) => {
    return doSignInWithEmail({ email: emailInput, password: pass, remember: true });
  }, []);

  const signUp = useCallback(
    async (input: { email: string; password: string; displayName?: string; username?: string }) => {
      return doSignUpWithEmail({
        email: input.email,
        password: input.password,
        displayName: input.displayName || input.username || "User",
        username: input.username || input.email.split("@")[0] || "user",
        remember: true,
      });
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    return doSignInWithGoogle();
  }, []);

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

  const user: SimpleUser | null = useMemo(() => {
    if (!uid) return null;
    return {
      id: uid,
      email,
      displayName: profile?.displayName || null,
      username: profile?.username,
      avatarUrl: profile?.avatarUrl || null,
    };
  }, [uid, email, profile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      uid,
      email,
      profile,
      user,
      presence: profile?.presence ?? "offline",
      error,
      clearError: () => setError(null),
      refreshProfile,
      updateProfile,
      signIn,
      signUp,
      signInWithGoogle,
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
      user,
      error,
      refreshProfile,
      updateProfile,
      signIn,
      signUp,
      signInWithGoogle,
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
