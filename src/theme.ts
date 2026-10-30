export const THEME_NAMES = ["deep", "reef", "midnight"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

export type Theme = {
  name: ThemeName;
  /** Water gradient stops top → bottom */
  water: [string, string, string];
  glow: { color: string; mid: string };
  sand: [string, string];
  film: string;
  glass: string;
  kelp: readonly [string, string, string, string];
  fish: readonly { body: string; accent: string }[];
  caption: { title: string; meta: string; note: string };
  ray: readonly [string, string, string];
  rock: readonly [string, string, string];
  reef: readonly [string, string, string];
};

const DEEP: Theme = {
  name: "deep",
  water: ["#163e4c", "#0c2c38", "#07141c"],
  glow: { color: "#2a7a86", mid: "#123844" },
  sand: ["#5a4a36", "#2c241a"],
  film: "#8fd0d4",
  glass: "#d4f0f2",
  kelp: ["#1a4f40", "#227056", "#163e34", "#2a7a5c"],
  fish: [
    { body: "#e6c07b", accent: "#c46b4a" },
    { body: "#d9a441", accent: "#b87333" },
    { body: "#5fa8a3", accent: "#2f6f74" },
    { body: "#c5d4d1", accent: "#7f9996" },
    { body: "#d4896a", accent: "#9e4d3c" },
    { body: "#7eb3c9", accent: "#3d6f88" },
  ],
  caption: { title: "#d5e6df", meta: "#9bb8b0", note: "rgba(186,214,208,0.55)" },
  ray: ["#7ec8c4", "#9ad4c8", "#7eb8c2"],
  rock: ["#2a241c", "#3a3228", "#4a4034"],
  reef: ["#6a5844", "#8d7860", "#a89070"],
};

const REEF: Theme = {
  name: "reef",
  water: ["#1a5f6e", "#0e3d4a", "#082028"],
  glow: { color: "#3cb8a8", mid: "#1a5a58" },
  sand: ["#c4a574", "#6b5338"],
  film: "#a8e8e0",
  glass: "#e8fff8",
  kelp: ["#1f6b4a", "#2d8f62", "#145238", "#3aa870"],
  fish: [
    { body: "#ff8f6b", accent: "#e04870" },
    { body: "#ffd166", accent: "#f08a24" },
    { body: "#06d6a0", accent: "#118ab2" },
    { body: "#ef476f", accent: "#9b2226" },
    { body: "#4cc9f0", accent: "#4361ee" },
    { body: "#f4a261", accent: "#e76f51" },
  ],
  caption: { title: "#e8fff6", meta: "#a8d4c8", note: "rgba(168,232,220,0.6)" },
  ray: ["#7ef0d8", "#ffe08a", "#ff9eb5"],
  rock: ["#5c4030", "#7a5640", "#9a7050"],
  reef: ["#8b6914", "#b8860b", "#daa520"],
};

const MIDNIGHT: Theme = {
  name: "midnight",
  water: ["#1a1430", "#0e0a1c", "#05040c"],
  glow: { color: "#6b5b95", mid: "#2a2048" },
  sand: ["#2a2438", "#12101a"],
  film: "#a89cc8",
  glass: "#d4c8f0",
  kelp: ["#2a3850", "#3a4a68", "#1e2838", "#4a6080"],
  fish: [
    { body: "#c9b6e4", accent: "#7b5ea7" },
    { body: "#90e0ef", accent: "#48bfe3" },
    { body: "#f72585", accent: "#b5179e" },
    { body: "#e0aaff", accent: "#9d4edd" },
    { body: "#80ffdb", accent: "#56cfe1" },
    { body: "#ffd6a5", accent: "#ffadad" },
  ],
  caption: { title: "#e8e0f8", meta: "#a898c0", note: "rgba(200,190,230,0.55)" },
  ray: ["#9b8ec4", "#7ec8e8", "#e0a0d0"],
  rock: ["#1a1624", "#2a2438", "#3a3450"],
  reef: ["#3a3550", "#524a70", "#6a6090"],
};

const THEMES: Record<ThemeName, Theme> = {
  deep: DEEP,
  reef: REEF,
  midnight: MIDNIGHT,
};

export function parseTheme(value: string | undefined): ThemeName {
  const raw = (value ?? "deep").trim().toLowerCase();
  if ((THEME_NAMES as readonly string[]).includes(raw)) {
    return raw as ThemeName;
  }
  throw new Error(
    `Unknown --theme "${value}". Use: ${THEME_NAMES.join(", ")}`,
  );
}

export function getTheme(name: ThemeName = "deep"): Theme {
  return THEMES[name];
}
