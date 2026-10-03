import React, { createContext, useContext, useMemo, useState } from "react";
import { getTheme, type Theme } from "../theme";
import type { UserSettings, AccentName, ThemePreference } from "../lib/types";

interface ThemeContextValue {
  theme: Theme;
  themeName: UserSettings["theme"];
  accentName: UserSettings["accent"];
  accent: UserSettings["accent"];
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (pref: ThemePreference) => void;
  setAccent: (accent: AccentName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  themeName = "aurora",
  accentName = "azure",
}: {
  children: React.ReactNode;
  themeName?: UserSettings["theme"];
  accentName?: UserSettings["accent"];
}) {
  const [currentTheme, setCurrentTheme] = useState<UserSettings["theme"]>(themeName);
  const [currentAccent, setCurrentAccent] = useState<UserSettings["accent"]>(accentName);

  const value = useMemo(() => {
    const t = getTheme(currentTheme, currentAccent);
    const pref: ThemePreference =
      currentTheme === "dark" || currentTheme === "noir"
        ? "dark"
        : currentTheme === "system"
        ? "system"
        : "light";

    return {
      theme: t,
      themeName: currentTheme,
      accentName: currentAccent,
      accent: currentAccent,
      preference: pref,
      isDark: t.isDark,
      setPreference: (p: ThemePreference) => {
        const mapped: UserSettings["theme"] = p === "dark" ? "dark" : p === "system" ? "system" : "aurora";
        setCurrentTheme(mapped);
      },
      setAccent: (a: AccentName) => setCurrentAccent(a),
    };
  }, [currentTheme, currentAccent]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const fallbackTheme = getTheme("aurora", "azure");
    return {
      theme: fallbackTheme,
      themeName: "aurora",
      accentName: "azure",
      accent: "azure",
      preference: "dark",
      isDark: true,
      setPreference: () => {},
      setAccent: () => {},
    };
  }
  return ctx;
}
