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
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/types";
import { saveSettings, watchSettings } from "@/lib/supabase/users";
import { useAuth } from "./auth-provider";

/* ── accent ramps (runtime override of the brand scale) ───── */

const ACCENTS: Record<UserSettings["accent"], Record<string, string>> = {
  azure: {
    "--color-brand-200": "#b9d1fb",
    "--color-brand-300": "#8aaff4",
    "--color-brand-400": "#5a8ceb",
    "--color-brand-500": "#3670dd",
    "--color-brand-600": "#2255b8",
    "--color-brand-700": "#1c4492",
  },
  slate: {
    "--color-brand-200": "#cbd3e1",
    "--color-brand-300": "#a3aec2",
    "--color-brand-400": "#7c8aa3",
    "--color-brand-500": "#55637d",
    "--color-brand-600": "#3f4c63",
    "--color-brand-700": "#2c374b",
  },
  teal: {
    "--color-brand-200": "#a9ecdd",
    "--color-brand-300": "#6ad9c4",
    "--color-brand-400": "#2cbfa6",
    "--color-brand-500": "#16a394",
    "--color-brand-600": "#0f7f75",
    "--color-brand-700": "#0c615a",
  },
  gold: {
    "--color-brand-200": "#ffe9c9",
    "--color-brand-300": "#ffd9a3",
    "--color-brand-400": "#eaa14a",
    "--color-brand-500": "#c07c1f",
    "--color-brand-600": "#96601a",
    "--color-brand-700": "#6f4712",
  },
};

const BACKDROPS: Record<UserSettings["theme"], string> = {
  aurora: "#3670dd",
  ember: "#c07c1f",
  mint: "#16a394",
  noir: "#55637d",
  dark: "#0a0e17",
};

function applyAccent(accent: UserSettings["accent"]) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(ACCENTS[accent] ?? ACCENTS.azure)) {
    root.style.setProperty(k, v);
  }
  root.dataset.accent = accent;
}

/* ── context ──────────────────────────────────────────────── */

interface SettingsContextValue {
  settings: UserSettings;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  reset: () => void;
  ready: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { uid } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /* Local preferences win on first paint (before the network answers). */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("omi.settings");
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      /* ignore malformed cache */
    }
    setHydrated(true);
  }, []);

  /* Push local prefs to CSS + localStorage. */
  useEffect(() => {
    if (!hydrated) return;
    applyAccent(settings.accent);
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.compact = String(settings.compactMode);
    document.documentElement.dataset.themeBg = BACKDROPS[settings.theme];
    try {
      localStorage.setItem("omi.settings", JSON.stringify(settings));
    } catch {
      /* quota — non fatal */
    }
  }, [settings, hydrated]);

  /* Cloud sync once authenticated. */
  useEffect(() => {
    if (!uid) {
      setReady(true);
      return;
    }
    const unwatch = watchSettings(uid, (remote) => {
      setSettings(remote);
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

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    if (uid) void saveSettings(uid, DEFAULT_SETTINGS).catch(() => undefined);
  }, [uid]);

  const value = useMemo(
    () => ({ settings, set, reset, ready }),
    [settings, set, reset, ready],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}

export { ACCENTS, BACKDROPS };