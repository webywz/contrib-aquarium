export type DataSource = "graphql" | "events" | "mock";

export type ContributionDay = {
  date: string;
  count: number;
  weekday: number;
};

export type ContributionWeek = {
  days: ContributionDay[];
};

export type Activity = {
  login: string;
  name: string | null;
  totalContributions: number;
  weeks: ContributionWeek[];
  source: DataSource;
  range: { from: string; to: string };
};

export type LoadSource = "auto" | DataSource;

export type { ThemeName } from "./theme.js";

export type LoadOptions = {
  user: string;
  token?: string;
  source?: LoadSource;
  now?: Date;
  fetchImpl?: typeof fetch;
};

export type SvgSizeOptions = {
  /** Display width in px (viewBox stays 860×300). */
  width?: number;
  /** Display height in px; defaults to proportional when only width is set. */
  height?: number;
  /** When true, strip all animations so fish and plants rest. */
  static?: boolean;
};

export type GenerateOptions = LoadOptions & {
  theme?: import("./theme.js").ThemeName;
} & SvgSizeOptions;

export type GenerateResult = {
  svg: string;
  activity: Activity;
};

export type Species = "tetra" | "koi" | "angel";

export type FishModel = {
  id: number;
  species: Species;
  size: number;
  body: string;
  accent: string;
  y: number;
  duration: number;
  delay: number;
  bob: number;
  reverse: boolean;
  restX: number;
  wag: number;
};

export type PlantModel = {
  id: number;
  x: number;
  height: number;
  blades: number;
  delay: number;
  duration: number;
  palette: number;
};

export type BubbleModel = {
  id: number;
  x: number;
  r: number;
  duration: number;
  delay: number;
  startY: number;
};

export type ReefColumn = {
  x: number;
  width: number;
  height: number;
  opacity: number;
};

export type AquariumModel = {
  fish: FishModel[];
  plants: PlantModel[];
  bubbles: BubbleModel[];
  reef: ReefColumn[];
  turbulence: number;
  streak: number;
  recent14: number;
  activeDays: number;
};

export const FISH_MIN = 3;
export const FISH_MAX = 18;
export const PLANT_MIN = 5;
export const PLANT_MAX = 14;
export const BUBBLE_MIN = 6;
export const BUBBLE_MAX = 24;
