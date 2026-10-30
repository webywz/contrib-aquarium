import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockActivity } from "../src/activity.js";
import { mapAquarium } from "../src/mapping.js";
import { renderAquarium } from "../src/render.js";
import { getTheme, parseTheme, THEME_NAMES } from "../src/theme.js";

const FROZEN = new Date("2026-10-29T12:00:00Z");

describe("theme", () => {
  it("lists all six themes", () => {
    assert.deepEqual([...THEME_NAMES], ["deep", "reef", "midnight", "lagoon", "ember", "fog"]);
  });

  it("defaults parseTheme to deep", () => {
    assert.equal(parseTheme(undefined), "deep");
    assert.equal(parseTheme("REEF"), "reef");
    assert.equal(parseTheme("lagoon"), "lagoon");
    assert.equal(parseTheme("EMBER"), "ember");
    assert.equal(parseTheme("Fog"), "fog");
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
    assert.match(deep, /data-theme="deep"/);
    assert.match(reef, /data-theme="reef"/);
    assert.match(midnight, /data-theme="midnight"/);
    assert.match(lagoon, /data-theme="lagoon"/);
    assert.match(ember, /data-theme="ember"/);
    assert.match(fog, /data-theme="fog"/);
    assert.ok(deep.includes(getTheme("deep").water[0]));
    assert.ok(reef.includes(getTheme("reef").water[0]));
    assert.ok(midnight.includes(getTheme("midnight").water[0]));
    assert.ok(lagoon.includes(getTheme("lagoon").water[0]));
    assert.ok(ember.includes(getTheme("ember").water[0]));
    assert.ok(fog.includes(getTheme("fog").water[0]));
    assert.notEqual(deep, reef);
    assert.notEqual(reef, midnight);
    assert.notEqual(lagoon, ember);
    assert.notEqual(ember, fog);
  });

  it("keeps fish counts stable across themes", () => {
    const activity = mockActivity("theme-demo", FROZEN);
    const a = mapAquarium(activity, "deep");
    const b = mapAquarium(activity, "reef");
    assert.equal(a.fish.length, b.fish.length);
    assert.equal(a.plants.length, b.plants.length);
  });
});
