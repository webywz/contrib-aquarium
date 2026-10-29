import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  currentStreak,
  mapAquarium,
  mapBubbleCount,
  mapFishCount,
  mapPlantCount,
  recentTotal,
} from "../src/mapping.js";
import { mockActivity } from "../src/activity.js";
import {
  BUBBLE_MAX,
  BUBBLE_MIN,
  FISH_MAX,
  FISH_MIN,
  PLANT_MAX,
  PLANT_MIN,
  type ContributionDay,
} from "../src/types.js";

describe("mapFishCount", () => {
  it("keeps an empty year from looking abandoned", () => {
    assert.equal(mapFishCount(0), FISH_MIN);
    assert.equal(mapFishCount(-12), FISH_MIN);
    assert.equal(mapFishCount(Number.NaN), FISH_MIN);
  });

  it("uses the documented sqrt mapping", () => {
    assert.equal(mapFishCount(36), 6);
    assert.equal(mapFishCount(100), 8);
    assert.equal(mapFishCount(400), 13);
    assert.equal(mapFishCount(1000), FISH_MAX);
    assert.equal(mapFishCount(10_000), FISH_MAX);
  });

  it("never exceeds the school cap and grows with activity", () => {
    let previous = mapFishCount(0);
    for (const total of [10, 40, 90, 160, 250, 500, 900, 2000]) {
      const next = mapFishCount(total);
      assert.ok(next >= previous);
      assert.ok(next >= FISH_MIN && next <= FISH_MAX);
      previous = next;
    }
  });
});

describe("mapPlantCount / mapBubbleCount", () => {
  it("clamps plants into a readable kelp range", () => {
    assert.equal(mapPlantCount(0, 0), PLANT_MIN);
    assert.ok(mapPlantCount(40, 1) <= PLANT_MAX);
    assert.equal(mapPlantCount(40, 1), PLANT_MAX);
  });

  it("maps recent activity onto bubbles", () => {
    assert.equal(mapBubbleCount(0), BUBBLE_MIN);
    assert.equal(mapBubbleCount(9), 9);
    assert.equal(mapBubbleCount(100), BUBBLE_MAX);
  });
});

describe("currentStreak", () => {
  const day = (date: string, count: number): ContributionDay => ({
    date,
    count,
    weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
  });

  it("ignores an empty today and counts consecutive older days", () => {
    const days = [
      day("2026-10-25", 2),
      day("2026-10-26", 1),
      day("2026-10-27", 4),
      day("2026-10-28", 3),
      day("2026-10-29", 0),
    ];
    assert.equal(currentStreak(days, "2026-10-29"), 4);
  });

  it("breaks on a zero day before today", () => {
    const days = [
      day("2026-10-26", 2),
      day("2026-10-27", 0),
      day("2026-10-28", 4),
      day("2026-10-29", 1),
    ];
    assert.equal(currentStreak(days, "2026-10-29"), 2);
  });

  it("returns zero when the calendar is empty", () => {
    assert.equal(currentStreak([]), 0);
  });
});

describe("recentTotal", () => {
  it("sums the trailing window", () => {
    const days: ContributionDay[] = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      count: i + 1,
      weekday: 0,
    }));
    assert.equal(recentTotal(days, 14), 20 * 21 / 2 - (6 * 7) / 2);
  });
});

describe("mapAquarium", () => {
  it("spawns as many fish as the mapping says", () => {
    const activity = mockActivity("webywz", new Date("2026-10-29T12:00:00Z"));
    const model = mapAquarium(activity);
    assert.equal(model.fish.length, mapFishCount(activity.totalContributions));
    assert.equal(model.plants.length, mapPlantCount(model.streak, model.activeDays / Math.max(1, activity.weeks.flatMap((w) => w.days).length)));
    assert.equal(model.bubbles.length, mapBubbleCount(model.recent14));
    assert.equal(model.reef.length, activity.weeks.length);
  });

  it("is deterministic for the same activity snapshot", () => {
    const activity = mockActivity("octocat", new Date("2026-01-15T00:00:00Z"));
    const a = mapAquarium(activity);
    const b = mapAquarium(activity);
    assert.deepEqual(a, b);
  });
});
