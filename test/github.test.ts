import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  annotation,
  appendGitHubStepSummary,
  escapeData,
  escapeProperty,
  formatGenerateNotice,
  formatGenerateStepSummary,
  formatThemesNotice,
  formatThemesStepSummary,
} from "../src/github.js";

describe("github annotations", () => {
  it("escapes workflow command payloads", () => {
    assert.equal(escapeData("a%b\nc\rd"), "a%25b%0Ac%0Dd");
    assert.equal(escapeProperty("file:name,path"), "file%3Aname%2Cpath");
  });

  it("formats a basic annotation line", () => {
    assert.equal(annotation("error", "Missing --user <login>"), "::error::Missing --user <login>");
    assert.equal(
      annotation("notice", "hello\nworld", { file: "a.txt", line: 3, title: "t:1,2" }),
      "::notice file=a.txt,line=3,title=t%3A1%2C2::hello%0Aworld",
    );
  });

  it("formats a generate success notice", () => {
    const notice = formatGenerateNotice({
      login: "cli-demo",
      theme: "reef",
      source: "mock",
      output: "/tmp/tank.svg",
      fishCount: 8,
      totalContributions: 142,
    });
    assert.equal(
      notice,
      "cli-demo · theme=reef · /tmp/tank.svg · fish=8 · activity=142",
    );
    assert.match(annotation("notice", notice), /^::notice::cli-demo/);
  });

  it("formats a list-themes notice", () => {
    assert.equal(formatThemesNotice(6, false), "listed 6 themes");
    assert.equal(formatThemesNotice(6, true), "listed 6 themes (json)");
  });

  it("formats a concise generate step summary", () => {
    const md = formatGenerateStepSummary({
      login: "webywz",
      theme: "deep",
      source: "mock",
      output: "json",
      fishCount: 12,
      totalContributions: 1234,
    });
    assert.match(md, /## contrib-aquarium/);
    assert.match(md, /\*\*User\*\*/);
    assert.match(md, /webywz/);
    assert.match(md, /\*\*Output\*\* \| `json`/);
    assert.match(md, /\*\*Fish\*\* \| 12/);
    assert.match(md, /\*\*Activity\*\* \| 1234/);
  });

  it("formats a list-themes step summary", () => {
    const md = formatThemesStepSummary(["deep", "reef"], false);
    assert.match(md, /## contrib-aquarium/);
    assert.match(md, /Listed \*\*2\*\* themes: `deep`, `reef`/);
  });

  it("appends step summary when GITHUB_STEP_SUMMARY is set", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-gh-unit-"));
    const outFile = join(dir, "step_summary.md");
    const prev = process.env.GITHUB_STEP_SUMMARY;
    try {
      process.env.GITHUB_STEP_SUMMARY = outFile;
      appendGitHubStepSummary("## contrib-aquarium\n");
      const body = await readFile(outFile, "utf8");
      assert.match(body, /## contrib-aquarium/);
    } finally {
      if (prev === undefined) delete process.env.GITHUB_STEP_SUMMARY;
      else process.env.GITHUB_STEP_SUMMARY = prev;
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("no-ops step summary when GITHUB_STEP_SUMMARY is unset", () => {
    const prev = process.env.GITHUB_STEP_SUMMARY;
    try {
      delete process.env.GITHUB_STEP_SUMMARY;
      appendGitHubStepSummary("## contrib-aquarium\n");
    } finally {
      if (prev === undefined) delete process.env.GITHUB_STEP_SUMMARY;
      else process.env.GITHUB_STEP_SUMMARY = prev;
    }
  });
});
