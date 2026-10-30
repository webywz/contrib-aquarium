export { generateAquarium } from "./generate.js";
export { loadActivity, mockActivity, fetchGraphqlActivity, fetchEventsActivity, ActivityError } from "./activity.js";
export { renderAquarium, SVG_WIDTH, SVG_HEIGHT, countSvgElements } from "./render.js";
export {
  mapAquarium,
  mapFishCount,
  mapPlantCount,
  mapBubbleCount,
  currentStreak,
  recentTotal,
  flattenDays,
} from "./mapping.js";
export type {
  Activity,
  AquariumModel,
  ContributionDay,
  ContributionWeek,
  DataSource,
  GenerateOptions,
  GenerateResult,
  LoadOptions,
  LoadSource,
} from "./types.js";
export { FISH_MIN, FISH_MAX, PLANT_MIN, PLANT_MAX, BUBBLE_MIN, BUBBLE_MAX } from "./types.js";
export { getTheme, parseTheme, THEME_NAMES } from "./theme.js";
export type { Theme, ThemeName } from "./theme.js";

