import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockActivity } from "../src/activity.js";
import { mapAquarium } from "../src/mapping.js";
import { renderAquarium } from "../src/render.js";
import { getTheme, parseTheme, THEME_NAMES } from "../src/theme.js";

const FROZEN = new Date("2026-10-29T12:00:00Z");

describe("theme", () => {
  it("lists all seven themes including aurora", () => {
    assert.deepEqual([...THEME_NAMES], ["deep", "reef", "midnight", "lagoon", "ember", "fog", "aurora"]);
  });

  it("defaults parseTheme to deep", () => {
    assert.equal(parseTheme(undefined), "deep");
    assert.equal(parseTheme("REEF"), "reef");
    assert.equal(parseTheme("lagoon"), "lagoon");
    assert.equal(parseTheme("EMBER"), "ember");
    assert.equal(parseTheme("Fog"), "fog");
    assert.equal(parseTheme("AURORA"), "aurora");
  });

  it("rejects unknown themes", () => {
    assert.throws(() => parseTheme("lava"), /Unknown --theme/);
  });

  it("tags svg with data-theme and changes water stop", () => {
    const activity = mockActivity("theme-demo", FROZEN);
    const deep = renderAquarium(activity, "deep");
    const reef = renderAquarium(activity, "reef");
    const midnight = renderAquarium(activity, "midnight");
    const lagoon = renderAquarium(activity, "lagoon");
    const ember = renderAquarium(activity, "ember");
    const fog = renderAquarium(activity, "fog");
    const aurora = renderAquarium(activity, "aurora");
    assert.match(deep, /data-theme="deep"/);
    assert.match(reef, /data-theme="reef"/);
    assert.match(midnight, /data-theme="midnight"/);
    assert.match(lagoon, /data-theme="lagoon"/);
    assert.match(ember, /data-theme="ember"/);
    assert.match(fog, /data-theme="fog"/);
    assert.match(aurora, /data-theme="aurora"/);
    assert.ok(deep.includes(getTheme("deep").water[0]));
    assert.ok(reef.includes(getTheme("reef").water[0]));
    assert.ok(midnight.includes(getTheme("midnight").water[0]));
    assert.ok(lagoon.includes(getTheme("lagoon").water[0]));
    assert.ok(ember.includes(getTheme("ember").water[0]));
    assert.ok(fog.includes(getTheme("fog").water[0]));
    assert.ok(aurora.includes(getTheme("aurora").water[0]));
    assert.notEqual(deep, reef);
    assert.notEqual(reef, midnight);
    assert.notEqual(lagoon, ember);
    assert.notEqual(ember, fog);
    assert.notEqual(aurora, deep);
    assert.notEqual(aurora, fog);
    assert.notEqual(aurora, midnight);
  });

  it("keeps fish counts stable across themes", () => {
    const activity = mockActivity("theme-demo", FROZEN);
    const a = mapAquarium(activity, "deep");
    const b = mapAquarium(activity, "reef");
    const c = mapAquarium(activity, "aurora");
    assert.equal(a.fish.length, b.fish.length);
    assert.equal(a.plants.length, b.plants.length);
    assert.equal(a.fish.length, c.fish.length);
    assert.equal(a.plants.length, c.plants.length);
  });

  it("resolves aurora as a distinct polar-night palette", () => {
    const aurora = getTheme("aurora");
    assert.equal(aurora.name, "aurora");
    assert.equal(aurora.water.length, 3);
    assert.equal(aurora.sand.length, 2);
    assert.equal(aurora.kelp.length, 4);
    assert.equal(aurora.fish.length, 6);
    assert.notEqual(aurora.water[0], getTheme("deep").water[0]);
    assert.notEqual(aurora.water[0], getTheme("fog").water[0]);
    assert.notEqual(aurora.water[0], getTheme("midnight").water[0]);
    assert.notEqual(aurora.glow.color, getTheme("deep").glow.color);
    assert.notEqual(aurora.glow.color, getTheme("fog").glow.color);
    assert.notEqual(aurora.glow.color, getTheme("midnight").glow.color);
  });
});
