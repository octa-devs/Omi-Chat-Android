import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SETTINGS, type UserSettings } from "../lib/types";
import { saveSettings, watchSettings } from "../lib/supabase/users";
import { useAuth } from "./auth-provider";
import { ThemeProvider } from "./theme-provider";

interface SettingsContextValue {
  settings: UserSettings;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  update: (patch: Partial<UserSettings>) => void;
  reset: () => void;
  ready: boolean;
  isPinned: (chatId: string) => boolean;
  togglePin: (chatId: string) => void;
  isMuted: (chatId: string) => boolean;
  toggleMute: (chatId: string) => void;
  isBlocked: (uid: string) => boolean;
  toggleBlock: (uid: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const SETTINGS_STORAGE_KEY = "omi:native:settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { uid, profile, setChatPinned, setChatMuted } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
          } catch {
            // ignore
          }
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  // Save to AsyncStorage on settings change
  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  // Cloud sync if signed in
  useEffect(() => {
    if (!uid) {
      setReady(true);
      return;
    }
    const unwatch = watchSettings(uid, (remote) => {
      if (remote) setSettings(remote);
      setReady(true);
    });
    return unwatch;
  }, [uid]);

  const set = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        if (uid) void saveSettings(uid, next).catch(() => undefined);
        return next;
      });
    },
    [uid],
  );

  const update = useCallback(
    (patch: Partial<UserSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        if (uid) void saveSettings(uid, next).catch(() => undefined);
        return next;
      });
    },
    [uid],
  );

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    if (uid) void saveSettings(uid, DEFAULT_SETTINGS).catch(() => undefined);
  }, [uid]);

  const isPinned = useCallback(
    (chatId: string) => Boolean(profile?.pinnedChats?.[chatId]),
    [profile?.pinnedChats],
  );

  const togglePin = useCallback(
    (chatId: string) => {
      const current = isPinned(chatId);
      setChatPinned(chatId, !current);
    },
    [isPinned, setChatPinned],
  );

  const isMuted = useCallback(
    (chatId: string) => Boolean(profile?.mutedChats?.[chatId]),
    [profile?.mutedChats],
  );

  const toggleMute = useCallback(
    (chatId: string) => {
      const current = isMuted(chatId);
      setChatMuted(chatId, !current);
    },
    [isMuted, setChatMuted],
  );

  const isBlocked = useCallback(
    (targetUid: string) => Boolean(profile?.blocked?.[targetUid]),
    [profile?.blocked],
  );

  const toggleBlock = useCallback(
    (targetUid: string) => {
      // Toggle blocked
    },
    [],
  );

  const value = useMemo(
    () => ({
      settings,
      set,
      update,
      reset,
      ready,
      isPinned,
      togglePin,
      isMuted,
      toggleMute,
      isBlocked,
      toggleBlock,
    }),
    [
      settings,
      set,
      update,
      reset,
      ready,
      isPinned,
      togglePin,
      isMuted,
      toggleMute,
      isBlocked,
      toggleBlock,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>
      <ThemeProvider themeName={settings.theme} accentName={settings.accent}>
        {children}
      </ThemeProvider>
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used inside <SettingsProvider>");
  }
  return ctx;
}
