import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml, formatHtml, inlineSvg, type HtmlReportInput } from "../src/html.js";

function sample(overrides: Partial<HtmlReportInput> = {}): HtmlReportInput {
  return {
    login: "webywz",
    name: null,
    totalContributions: 1234,
    source: "mock",
    range: { from: "2025-10-31", to: "2026-10-30" },
    streak: 42,
    activeDays: 256,
    recent14: 89,
    fishCount: 12,
    plantCount: 11,
    bubbleCount: 15,
    theme: "reef",
    outPath: "/tmp/tank.svg",
    width: 860,
    height: 300,
    staticMode: false,
    version: "0.1.11",
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" data-user="webywz"></svg>
`,
    ...overrides,
  };
}

describe("escapeHtml / formatHtml", () => {
  it("escapes angle brackets amp quotes", () => {
    assert.equal(
      escapeHtml(`<script>alert("x")</script>&'`),
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;",
    );
  });

  it("strips the XML declaration for inline SVG", () => {
    assert.equal(inlineSvg('<?xml version="1.0"?><svg></svg>\n'), "<svg></svg>");
  });

  it("emits a self-contained report with stats and no CDN", () => {
    const html = formatHtml(sample(), { locale: "en" });
    assert.match(html, /<!DOCTYPE html>/i);
    assert.match(html, /lang="en"/);
    assert.match(html, /contrib-aquarium/);
    assert.match(html, /webywz/);
    assert.match(html, /reef/);
    assert.match(html, /mock/);
    assert.match(html, /\/tmp\/tank\.svg/);
    assert.match(html, /1234/);
    assert.match(html, /860×300/);
    assert.match(html, /<svg /);
    assert.doesNotMatch(html, /<\?xml/);
    assert.doesNotMatch(html, /cdn\.|unpkg|jsdelivr|fonts\.googleapis/i);
    assert.doesNotMatch(html, /<script[\s>]/i);
    assert.match(html, /self-contained · offline/);
  });

  it("escapes hostile login / path / name", () => {
    const html = formatHtml(
      sample({
        login: `<img src=x onerror="alert(1)">`,
        name: `</td><script>alert(1)</script>`,
        outPath: `"><svg onload="alert(1)">`,
        theme: `deep"><meta`,
      }),
    );
    assert.doesNotMatch(html, /<img\s/i);
    assert.doesNotMatch(html, /\sonerror="/i);
    assert.doesNotMatch(html, /<script[\s>]/i);
    assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.match(html, /&lt;\/td&gt;/);
  });

  it("uses zh labels when locale is zh", () => {
    const html = formatHtml(sample(), { locale: "zh" });
    assert.match(html, /lang="zh"/);
    assert.match(html, /离线鱼缸报告/);
    assert.match(html, /连续打卡/);
    assert.match(html, /自包含 · 离线/);
  });
});
