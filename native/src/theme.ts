import type { UserSettings } from "./lib/types";

/**
 * Design tokens — the native mirror of `src/app/globals.css` in the web app.
 * Full support for light and dark themes and accent scales.
 */

export const lightPalette = {
  ink950: "#f4f6fb", // page background
  ink900: "#ffffff", // cards / panels
  ink850: "#fbfcfe", // subtle surface
  ink800: "#eef1f7", // tracks, hover fills
  ink750: "#e7eaf2",
  ink700: "#dde2ec",
  ink600: "#c8cfdd",
  ink500: "#aab2c3",
  ink400: "#8b93a6",

  fg: "#131725", // primary text
  fg2: "#3a4257", // secondary
  fg3: "#5c6479", // muted
  muted: "#7b8397", // faint
  onAccent: "#ffffff",

  line: "#dfe4ee",
  lineStrong: "#c9d0de",
  surface: "#ffffff",
  surface2: "#f7f9fc",
  surface3: "#eef1f7",
  scrim: "#10162a",

  brand50: "#eff5ff",
  brand100: "#dbe8fe",
  brand200: "#b9d1fb",
  brand300: "#8aaff4",
  brand400: "#5a8ceb",
  brand500: "#3670dd",
  brand600: "#2255b8",
  brand700: "#1c4492",
  brand800: "#173673",

  gold100: "#fff6e6",
  gold200: "#ffe9c9",
  gold300: "#ffd9a3",
  gold400: "#ffc97b",
  gold500: "#eaa14a",
  gold600: "#c07c1f",
  gold700: "#96601a",

  mint100: "#d8f7f0",
  mint200: "#a9ecdd",
  mint300: "#6ad9c4",
  mint400: "#2cbfa6",
  mint500: "#16a394",
  mint600: "#0f7f75",
  mint700: "#0c615a",

  rust50: "#fff1f2",
  rust100: "#ffe4e7",
  rust200: "#ffc2c9",
  rust300: "#ff97a5",
  rust400: "#f4617a",
  rust500: "#e0334f",
  rust600: "#c21e3c",
  rust700: "#9c1730",
};

export const darkPalette = {
  ink950: "#070a12", // page canvas
  ink900: "#0d121f", // cards / panels
  ink850: "#13192b", // surface
  ink800: "#182037", // tracks, inputs
  ink750: "#202b46",
  ink700: "#293556",
  ink600: "#38466e",
  ink500: "#546596",
  ink400: "#788ab8",

  fg: "#f3f6fc",
  fg2: "#cad4ea",
  fg3: "#8c9bb7",
  muted: "#647494",
  onAccent: "#ffffff",

  line: "#1f2840",
  lineStrong: "#2c3859",
  surface: "#101526",
  surface2: "#151c32",
  surface3: "#1b233c",
  scrim: "#000000",

  brand50: "#121e3b",
  brand100: "#1a2b52",
  brand200: "#253e74",
  brand300: "#395ba8",
  brand400: "#4d7de6",
  brand500: "#3b82f6",
  brand600: "#2563eb",
  brand700: "#1d4ed8",
  brand800: "#1e40af",

  gold100: "#38250b",
  gold200: "#543912",
  gold300: "#82581d",
  gold400: "#b87c2b",
  gold500: "#e29b39",
  gold600: "#eaa14a",
  gold700: "#c07c1f",

  mint100: "#0c362f",
  mint200: "#135247",
  mint300: "#1c7566",
  mint400: "#269e8b",
  mint500: "#34c7b0",
  mint600: "#4ee0c8",
  mint700: "#16a394",

  rust50: "#2a0c12",
  rust100: "#42141c",
  rust200: "#611c2a",
  rust300: "#8c283c",
  rust400: "#bf3450",
  rust500: "#eb4467",
  rust600: "#ff5c7e",
  rust700: "#9c1730",
};

export const ACCENTS: Record<UserSettings["accent"], { primary: string; secondary: string; soft: string; border: string }> = {
  azure: {
    primary: "#2563eb",
    secondary: "#1d4ed8",
    soft: "#eff5ff",
    border: "#b9d1fb",
  },
  slate: {
    primary: "#55637d",
    secondary: "#3f4c63",
    soft: "#f1f3f7",
    border: "#cbd3e1",
  },
  teal: {
    primary: "#16a394",
    secondary: "#0f7f75",
    soft: "#d8f7f0",
    border: "#a9ecdd",
  },
  gold: {
    primary: "#c07c1f",
    secondary: "#96601a",
    soft: "#fff6e6",
    border: "#ffe9c9",
  },
  amber: {
    primary: "#f59e0b",
    secondary: "#d97706",
    soft: "#fef3c7",
    border: "#fde68a",
  },
};

export function getTheme(theme: UserSettings["theme"] = "aurora", accent: UserSettings["accent"] = "azure") {
  const isDark = theme === "dark" || theme === "noir";
  const p = isDark ? darkPalette : lightPalette;
  const acc = ACCENTS[accent] ?? ACCENTS.azure;

  return {
    isDark,
    palette: p,
    colors: {
      bg: p.ink950,
      background: p.ink950,
      surface: p.surface,
      surfaceElevated: p.surface,
      surfaceSubtle: p.ink850,
      surfaceSunk: p.surface3,
      card: p.surface,
      border: p.line,
      borderStrong: p.lineStrong,

      text: p.fg,
      foreground: p.fg,
      textSecondary: p.fg2,
      textMuted: p.fg3,
      mutedForeground: p.fg3,
      textFaint: p.muted,
      textOnAccent: p.onAccent,
      primaryForeground: p.onAccent,

      primary: acc.primary,
      accent: acc.primary,
      brand: acc.primary,
      brandHover: acc.secondary,
      brandSoft: isDark ? p.brand50 : acc.soft,
      brandBorder: acc.border,

      muted: p.surface3,
      gold: p.gold600,
      goldSoft: p.gold100,

      success: p.mint600,
      successSoft: p.mint100,

      danger: p.rust600,
      dangerSoft: isDark ? p.rust100 : p.rust100,

      scrim: p.scrim,
    },
    space: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      "2xl": 24,
      "3xl": 32,
      "4xl": 40,
      "5xl": 48,
    },
    radius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      "2xl": 24,
      "3xl": 28,
      "4xl": 32,
      pill: 999,
    },
    typography: {
      display: { fontSize: 30, lineHeight: 36, fontWeight: "700" as const },
      title: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const },
      heading: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
      subheading: { fontSize: 16, lineHeight: 22, fontWeight: "600" as const },
      body: { fontSize: 15, lineHeight: 21, fontWeight: "400" as const },
      bodyMedium: { fontSize: 15, lineHeight: 21, fontWeight: "500" as const },
      bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: "600" as const },
      small: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
      smallMedium: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const },
      caption: { fontSize: 11.5, lineHeight: 15, fontWeight: "500" as const },
    },
    hitSize: 44,
  };
}

export const color = darkPalette;
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  pill: 999,
};
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
};
export const HIT_SIZE = 44;
export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "700" as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: "600" as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "400" as const },
  bodyMedium: { fontSize: 15, lineHeight: 21, fontWeight: "500" as const },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: "600" as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  smallMedium: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const },
  caption: { fontSize: 11.5, lineHeight: 15, fontWeight: "500" as const },
};

export type Theme = ReturnType<typeof getTheme>;
