import {
  BUBBLE_MAX,
  BUBBLE_MIN,
  FISH_MAX,
  FISH_MIN,
  PLANT_MAX,
  PLANT_MIN,
  type Activity,
  type AquariumModel,
  type BubbleModel,
  type ContributionDay,
  type FishModel,
  type PlantModel,
  type ReefColumn,
  type Species,
} from "./types.js";
import { getTheme, type Theme, type ThemeName } from "./theme.js";
import { clamp, hashString, lerp, mulberry32, pick, type Rng } from "./util.js";

export function flattenDays(activity: Activity): ContributionDay[] {
  return activity.weeks.flatMap((week) => week.days);
}

/**
 * Map yearly totals onto a readable school size.
 * Empty years still get a few wanderers; very busy years cap at 18.
 *
 *   0 → 3,  36 → 6,  100 → 8,  400 → 13,  1000+ → 18
 */
export function mapFishCount(totalContributions: number): number {
  if (!Number.isFinite(totalContributions) || totalContributions <= 0) {
    return FISH_MIN;
  }
  return clamp(
    Math.round(FISH_MIN + Math.sqrt(totalContributions) * 0.48),
    FISH_MIN,
    FISH_MAX,
  );
}

export function mapPlantCount(streak: number, activeDayRatio: number): number {
  const safeStreak = Number.isFinite(streak) ? Math.max(0, streak) : 0;
  const ratio = Number.isFinite(activeDayRatio)
    ? clamp(activeDayRatio, 0, 1)
    : 0;
  return clamp(
    5 + Math.floor(safeStreak / 5) + Math.round(ratio * 4),
    PLANT_MIN,
    PLANT_MAX,
  );
}

export function mapBubbleCount(recent14Total: number): number {
  const recent = Number.isFinite(recent14Total) ? Math.max(0, recent14Total) : 0;
  return clamp(6 + Math.floor(recent / 3), BUBBLE_MIN, BUBBLE_MAX);
}

/**
 * Walk backwards from the newest day. A still-empty "today" does not break
 * the streak; any older zero does.
 */
export function currentStreak(
  days: ContributionDay[],
  todayIso?: string,
): number {
  if (days.length === 0) return 0;
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const today = todayIso ?? last.date;
  let index = sorted.length - 1;
  if (sorted[index].date === today && sorted[index].count === 0) {
    index -= 1;
  }
  let streak = 0;
  for (let i = index; i >= 0; i--) {
    if (sorted[i].count <= 0) break;
    streak += 1;
  }
  return streak;
}

export function recentTotal(days: ContributionDay[], window = 14): number {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-window).reduce((sum, day) => sum + day.count, 0);
}

function weekSum(days: ContributionDay[]): number {
  return days.reduce((sum, day) => sum + day.count, 0);
}

function speciesForRank(rank: number, intensity: number, rng: Rng): Species {
  if (rank === 0 && intensity > 0) return "angel";
  if (intensity >= 8 || (intensity >= 4 && rng() > 0.55)) return "koi";
  return "tetra";
}

export function mapAquarium(activity: Activity, themeName: ThemeName = "deep"): AquariumModel {
  const theme: Theme = getTheme(themeName);
  const days = flattenDays(activity);
  const dayCount = Math.max(days.length, 1);
  const activeDays = days.filter((day) => day.count > 0).length;
  const streak = currentStreak(days, activity.range.to);
  const recent14 = recentTotal(days, 14);
  const fishCount = mapFishCount(activity.totalContributions);
  const plantCount = mapPlantCount(streak, activeDays / dayCount);
  const bubbleCount = mapBubbleCount(recent14);
  const turbulence = clamp(
    activeDays / dayCount + Math.min(1, recent14 / 40) * 0.35,
    0.12,
    1,
  );

  const seed = hashString(
    `${activity.login.toLowerCase()}|${activity.range.from}|${activity.range.to}|${activity.totalContributions}`,
  );
  const rng = mulberry32(seed);

  const weekStats = activity.weeks.map((week) => ({
    sum: weekSum(week.days),
  }));
  const ranked = [...weekStats].sort((a, b) => b.sum - a.sum);
  const fallback = ranked[0] ?? { sum: 0 };

  const fish: FishModel[] = [];
  const usedY: number[] = [];
  for (let i = 0; i < fishCount; i++) {
    const week = ranked[i] ?? fallback;
    const intensity = week.sum;
    const species = speciesForRank(i, intensity, rng);
    const sizeBase =
      species === "angel"
        ? 28
        : species === "koi"
          ? 22
          : 13;
    const size = sizeBase + rng() * 7 + Math.min(8, intensity * 0.35);
    let y = 56 + rng() * 168;
    for (let attempt = 0; attempt < 6; attempt++) {
      if (usedY.every((other) => Math.abs(other - y) > 14)) break;
      y = 56 + rng() * 168;
    }
    usedY.push(y);
    const palette = pick(rng, theme.fish);
    const duration = lerp(18, 9, turbulence) + rng() * 8 + size * 0.18;
    fish.push({
      id: i,
      species,
      size,
      body: palette.body,
      accent: palette.accent,
      y,
      duration,
      delay: rng() * duration,
      bob: 2.2 + rng() * 2.4,
      reverse: rng() > 0.5,
      restX: 90 + rng() * 680,
      wag: 0.32 + rng() * 0.28 + (species === "tetra" ? 0.08 : 0),
    });
  }

  const plants: PlantModel[] = [];
  for (let i = 0; i < plantCount; i++) {
    const leftBank = i < Math.ceil(plantCount * 0.45);
    const x = leftBank ? 28 + rng() * 118 : 728 + rng() * 96;
    plants.push({
      id: i,
      x,
      height: 70 + rng() * 110 + Math.min(40, streak * 1.4),
      blades: 3 + Math.floor(rng() * 3),
      delay: rng() * 4,
      duration: 4.5 + rng() * 3.5,
      palette: Math.floor(rng() * 4),
    });
  }

  const bubbles: BubbleModel[] = [];
  const vents = plants.slice(0, Math.min(6, plants.length));
  for (let i = 0; i < bubbleCount; i++) {
    const vent = vents[i % Math.max(vents.length, 1)];
    bubbles.push({
      id: i,
      x: (vent?.x ?? 80) + (rng() - 0.5) * 28,
      r: 1.2 + rng() * 3.4,
      duration: 6 + rng() * 8,
      delay: rng() * 10,
      startY: 252 + rng() * 16,
    });
  }

  const columns = Math.max(activity.weeks.length, 1);
  const origin = 210;
  const span = 610;
  const step = span / columns;
  const maxWeek = Math.max(1, ...weekStats.map((week) => week.sum));
  const reef: ReefColumn[] = weekStats.map((week, i) => ({
    x: origin + i * step,
    width: Math.max(2.2, step * 0.55),
    height: 3 + (week.sum / maxWeek) * 26,
    opacity: 0.18 + (week.sum / maxWeek) * 0.42,
  }));

  return {
    fish,
    plants,
    bubbles,
    reef,
    turbulence,
    streak,
    recent14,
    activeDays,
  };
}
