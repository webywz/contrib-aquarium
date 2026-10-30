import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockActivity } from "../src/activity.js";
import { mapAquarium, mapFishCount } from "../src/mapping.js";
import {
  countSvgElements,
  renderAquarium,
  resolveSvgDisplaySize,
  SVG_HEIGHT,
  SVG_WIDTH,
} from "../src/render.js";
import type { Activity } from "../src/types.js";

const FROZEN = new Date("2026-10-29T00:00:00Z");

function emptyish(login: string): Activity {
  const activity = mockActivity(login, FROZEN);
  return {
    ...activity,
    totalContributions: 0,
    weeks: activity.weeks.map((week) => ({
      days: week.days.map((day) => ({ ...day, count: 0 })),
    })),
    source: "mock",
  };
}

describe("renderAquarium", () => {
  it("emits a self-contained SVG with tank geometry and no scripts", () => {
    const svg = renderAquarium(mockActivity("webywz", FROZEN));
    assert.match(svg, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    assert.match(svg, /<svg /);
    assert.match(svg, new RegExp(`viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}"`));
    assert.match(svg, /<style>/);
    assert.match(svg, /@keyframes swim/);
    assert.doesNotMatch(svg, /<script/i);
    assert.match(svg, /clip-path="url\(#tank\)"/);
    assert.match(svg, /data-user="webywz"/);
    assert.match(svg, /data-source="mock"/);
  });

  it("keeps fish count in sync with the mapping", () => {
    const activity = mockActivity("webywz", FROZEN);
    const svg = renderAquarium(activity);
    assert.equal(countSvgElements(svg, "fish"), mapFishCount(activity.totalContributions));
    const model = mapAquarium(activity);
    assert.equal(countSvgElements(svg, "plant"), model.plants.length);
    assert.equal(countSvgElements(svg, "bubble"), model.bubbles.length);
    assert.ok(countSvgElements(svg, "fish") >= 3);
  });

  it("still renders a quiet tank when the year is empty", () => {
    const svg = renderAquarium(emptyish("ghost"));
    assert.equal(countSvgElements(svg, "fish"), 3);
    assert.match(svg, /0 contributions/);
    assert.match(svg, /demo pattern from username/);
  });

  it("escapes XML in usernames", () => {
    const activity = mockActivity("webywz", FROZEN);
    activity.login = `alice</svg><script>alert(1)</script>`;
    const svg = renderAquarium(activity);
    assert.doesNotMatch(svg, /<script>alert/);
    assert.match(svg, /alice&lt;\/svg&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  });

  it("is byte-stable for the same activity", () => {
    const activity = mockActivity("stable-user", FROZEN);
    assert.equal(renderAquarium(activity), renderAquarium(activity));
  });

  it("labels GraphQL-backed tanks as real contributions", () => {
    const activity = mockActivity("webywz", FROZEN);
    activity.source = "graphql";
    activity.totalContributions = 74;
    const svg = renderAquarium(activity);
    assert.match(svg, /data-source="graphql"/);
    assert.match(svg, /data-total="74"/);
    assert.doesNotMatch(svg, /demo pattern from username/);
  });

  it("scales display size with width while keeping viewBox fixed", () => {
    const svg = renderAquarium(mockActivity("wide-user", FROZEN), "deep", { width: 430 });
    assert.match(svg, /width="430"/);
    assert.match(svg, /height="150"/);
    assert.match(svg, new RegExp(`viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}"`));
    assert.match(svg, /preserveAspectRatio="xMidYMid meet"/);
  });

  it("accepts an explicit height without changing viewBox", () => {
    const svg = renderAquarium(mockActivity("tall-user", FROZEN), "deep", {
      width: 640,
      height: 200,
    });
    assert.match(svg, /width="640"/);
    assert.match(svg, /height="200"/);
    assert.match(svg, new RegExp(`viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}"`));
  });

  it("defaults to the classic 860×300 display size", () => {
    const svg = renderAquarium(mockActivity("default-size", FROZEN));
    assert.match(svg, new RegExp(`width="${SVG_WIDTH}"`));
    assert.match(svg, new RegExp(`height="${SVG_HEIGHT}"`));
  });
});

describe("resolveSvgDisplaySize", () => {
  it("keeps defaults when unset", () => {
    assert.deepEqual(resolveSvgDisplaySize(), { width: SVG_WIDTH, height: SVG_HEIGHT });
  });

  it("derives height from width", () => {
    assert.deepEqual(resolveSvgDisplaySize({ width: 860 }), { width: 860, height: 300 });
    assert.deepEqual(resolveSvgDisplaySize({ width: 430 }), { width: 430, height: 150 });
  });

  it("derives width from height", () => {
    assert.deepEqual(resolveSvgDisplaySize({ height: 150 }), { width: 430, height: 150 });
  });
});
