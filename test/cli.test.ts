import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tsxBin = join(root, "node_modules", ".bin", "tsx");

async function runCli(
  args: string[],
  env: NodeJS.ProcessEnv = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const child = spawn(tsxBin, ["src/cli.ts", ...args], {
    cwd: root,
    env: {
      ...process.env,
      GITHUB_TOKEN: "",
      GH_TOKEN: "",
      GITHUB_STEP_SUMMARY: "",
      GITHUB_OUTPUT: "",
      ...env,
    },
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  const code = await new Promise<number>((resolve) => {
    child.on("close", (value) => resolve(value ?? 1));
  });
  return { code, stdout, stderr };
}

describe("CLI", () => {
  it("prints help with package version", async () => {
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
      version: string;
    };
    const result = await runCli(["--help"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, new RegExp(`contrib-aquarium ${pkg.version}`));
    assert.match(result.stdout, /--user/);
    assert.match(result.stdout, /GraphQL/);
    assert.match(result.stdout, /--quiet/);
  });

  it("prints --version matching package.json", async () => {
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
      version: string;
    };
    const result = await runCli(["--version"]);
    assert.equal(result.code, 0);
    assert.equal(result.stdout.trim(), pkg.version);
  });

  it("writes a mock aquarium to --out", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-"));
    const out = join(dir, "nested", "tank.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "cli-demo",
        "--source",
        "mock",
        "--out",
        out,
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stderr, /source=mock/);
      assert.match(result.stderr, /860×300/);
      assert.match(result.stderr, /cli-demo/);
      const svg = await readFile(out, "utf8");
      assert.match(svg, /<svg /);
      assert.match(svg, /data-user="cli-demo"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("suppresses summary with --quiet", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-quiet-"));
    const out = join(dir, "quiet.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "cli-quiet",
        "--source",
        "mock",
        "--out",
        out,
        "--quiet",
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.equal(result.stderr.trim(), "");
      const svg = await readFile(out, "utf8");
      assert.match(svg, /data-user="cli-quiet"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a missing user", async () => {
    const result = await runCli(["generate"]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Missing --user/);
  });

  it("rejects unknown options instead of ignoring them", async () => {
    const result = await runCli([
      "generate",
      "--user",
      "cli-unknown",
      "--source",
      "mock",
      "--mock",
    ]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Unknown option: --mock/);
  });

  it("rejects a bare unknown flag like --foo", async () => {
    const result = await runCli(["generate", "--user", "cli-foo", "--foo"]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Unknown option: --foo/);
  });

  it("rejects unexpected positional arguments", async () => {
    const result = await runCli([
      "generate",
      "--user",
      "cli-pos",
      "--source",
      "mock",
      "extra",
    ]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Unexpected argument: extra/);
  });

  it("rejects --user without a value", async () => {
    const result = await runCli(["generate", "--user", "--source", "mock"]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Missing value for --user/);
  });

  it("documents --theme in help", async () => {
    const result = await runCli(["--help"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /--theme/);
    assert.match(result.stdout, /reef/);
    assert.match(result.stdout, /aurora/);
  });

  it("writes an aurora-themed aquarium", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-aurora-"));
    const out = join(dir, "aurora.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "cli-aurora",
        "--source",
        "mock",
        "--theme",
        "aurora",
        "--out",
        out,
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stderr, /theme=aurora/);
      const svg = await readFile(out, "utf8");
      assert.match(svg, /data-theme="aurora"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writes a reef-themed aquarium", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-theme-"));
    const out = join(dir, "reef.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "cli-theme",
        "--source",
        "mock",
        "--theme",
        "reef",
        "--out",
        out,
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stderr, /theme=reef/);
      const svg = await readFile(out, "utf8");
      assert.match(svg, /data-theme="reef"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("documents --width in help", async () => {
    const result = await runCli(["--help"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /--width/);
    assert.match(result.stdout, /--height/);
    assert.match(result.stdout, /viewBox/);
  });

  it("writes a narrower aquarium with --width", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-width-"));
    const out = join(dir, "narrow.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "cli-width",
        "--source",
        "mock",
        "--width",
        "430",
        "--out",
        out,
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stderr, /430×150/);
      const svg = await readFile(out, "utf8");
      assert.match(svg, /width="430"/);
      assert.match(svg, /height="150"/);
      assert.match(svg, /viewBox="0 0 860 300"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a non-positive --width", async () => {
    const result = await runCli([
      "generate",
      "--user",
      "bad-width",
      "--source",
      "mock",
      "--width",
      "0",
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Invalid --width/);
  });

  it("prints JSON summary with --json", async () => {
    const result = await runCli([
      "generate",
      "--user",
      "json-demo",
      "--source",
      "mock",
      "--json",
    ]);
    assert.equal(result.code, 0, result.stderr);
    const json = JSON.parse(result.stdout) as {
      login: string;
      name: string | null;
      totalContributions: number;
      source: string;
      range: { from: string; to: string };
      streak: number;
      activeDays: number;
      recent14: number;
      fishCount: number;
      plantCount: number;
      bubbleCount: number;
    };
    assert.equal(json.login, "json-demo");
    assert.equal(json.source, "mock");
    assert.equal(typeof json.totalContributions, "number");
    assert.equal(typeof json.streak, "number");
    assert.equal(typeof json.activeDays, "number");
    assert.equal(typeof json.recent14, "number");
    assert.equal(typeof json.fishCount, "number");
    assert.equal(typeof json.plantCount, "number");
    assert.equal(typeof json.bubbleCount, "number");
    assert.ok(json.range.from);
    assert.ok(json.range.to);
  });

  it("writes JSON to file with --json --out", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-json-out-"));
    const out = join(dir, "report.json");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "json-file",
        "--source",
        "mock",
        "--json",
        "--out",
        out,
      ]);
      assert.equal(result.code, 0, result.stderr);
      // Stdout should be empty (silent)
      assert.equal(result.stdout.trim(), "");
      // File should contain valid JSON
      const jsonContent = await readFile(out, "utf8");
      const json = JSON.parse(jsonContent) as {
        login: string;
        source: string;
        totalContributions: number;
        streak: number;
        activeDays: number;
        recent14: number;
        fishCount: number;
        plantCount: number;
        bubbleCount: number;
      };
      assert.equal(json.login, "json-file");
      assert.equal(json.source, "mock");
      assert.equal(typeof json.totalContributions, "number");
      assert.equal(typeof json.fishCount, "number");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("creates parent directories for --json --out", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-json-nested-"));
    const out = join(dir, "nested", "deep", "report.json");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "json-nested",
        "--source",
        "mock",
        "--json",
        "--out",
        out,
      ]);
      assert.equal(result.code, 0, result.stderr);
      const jsonContent = await readFile(out, "utf8");
      const json = JSON.parse(jsonContent) as { login: string };
      assert.equal(json.login, "json-nested");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("documents --json in help", async () => {
    const result = await runCli(["--help"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /--json/);
    assert.match(result.stdout, /JSON/);
  });

  it("default SVG path still works (smoke test)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-svg-smoke-"));
    const out = join(dir, "smoke.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "svg-smoke",
        "--source",
        "mock",
        "--out",
        out,
      ]);
      assert.equal(result.code, 0, result.stderr);
      const svg = await readFile(out, "utf8");
      assert.match(svg, /<svg /);
      assert.match(svg, /data-user="svg-smoke"/);
      assert.match(svg, /viewBox="0 0 860 300"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("lists themes with --list-themes", async () => {
    const result = await runCli(["--list-themes"]);
    assert.equal(result.code, 0, result.stderr);
    const lines = result.stdout.trim().split("\n");
    assert.deepEqual(lines, ["deep", "reef", "midnight", "lagoon", "ember", "fog", "aurora"]);
  });

  it("lists themes as JSON with --list-themes --json", async () => {
    const result = await runCli(["--list-themes", "--json"]);
    assert.equal(result.code, 0, result.stderr);
    const themes = JSON.parse(result.stdout) as string[];
    assert.deepEqual(themes, ["deep", "reef", "midnight", "lagoon", "ember", "fog", "aurora"]);
  });

  it("lists themes without requiring --user", async () => {
    const result = await runCli(["--list-themes"]);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /deep/);
    assert.match(result.stdout, /reef/);
  });

  it("lists themes without requiring generate command", async () => {
    const result = await runCli(["--list-themes"]);
    assert.equal(result.code, 0, result.stderr);
    const lines = result.stdout.trim().split("\n");
    assert.equal(lines.length, 7);
    assert.ok(lines.includes("aurora"));
  });

  it("documents --list-themes in help", async () => {
    const result = await runCli(["--help"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /--list-themes/);
  });

  it("shows help in Chinese with --locale zh", async () => {
    const result = await runCli(["--help", "--locale", "zh"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /将 GitHub 年度贡献转化成活体 SVG 鱼缸/);
    assert.match(result.stdout, /用法:/);
    assert.match(result.stdout, /选项:/);
    assert.match(result.stdout, /--locale/);
  });

  it("shows help in English by default", async () => {
    const result = await runCli(["--help"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /Turn a GitHub year into a living SVG aquarium/);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /Options:/);
    assert.match(result.stdout, /--locale/);
  });

  it("shows help in English with --locale en", async () => {
    const result = await runCli(["--help", "--locale", "en"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /Turn a GitHub year into a living SVG aquarium/);
  });

  it("shows error in Chinese with --locale zh for missing --user", async () => {
    const result = await runCli(["generate", "--locale", "zh"]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /缺少 --user/);
  });

  it("shows error in English by default for missing --user", async () => {
    const result = await runCli(["generate"]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Missing --user/);
  });

  it("shows error in Chinese for unknown option with --locale zh", async () => {
    const result = await runCli(["generate", "--locale", "zh", "--user", "test", "--unknown"]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /未知选项/);
  });

  it("JSON output is unchanged regardless of locale", async () => {
    const enResult = await runCli([
      "generate",
      "--user",
      "locale-test",
      "--source",
      "mock",
      "--locale",
      "en",
      "--json",
    ]);
    const zhResult = await runCli([
      "generate",
      "--user",
      "locale-test",
      "--source",
      "mock",
      "--locale",
      "zh",
      "--json",
    ]);
    assert.equal(enResult.code, 0);
    assert.equal(zhResult.code, 0);
    const enJson = JSON.parse(enResult.stdout);
    const zhJson = JSON.parse(zhResult.stdout);
    assert.deepEqual(enJson, zhJson);
    assert.equal(enJson.login, "locale-test");
    assert.equal(enJson.source, "mock");
  });

  it("--list-themes output is unchanged with --locale zh", async () => {
    const enResult = await runCli(["--list-themes"]);
    const zhResult = await runCli(["--list-themes", "--locale", "zh"]);
    assert.equal(enResult.code, 0);
    assert.equal(zhResult.code, 0);
    assert.equal(enResult.stdout, zhResult.stdout);
    assert.match(enResult.stdout, /deep/);
    assert.match(enResult.stdout, /reef/);
  });

  it("--list-themes --json output is unchanged with --locale zh", async () => {
    const enResult = await runCli(["--list-themes", "--json"]);
    const zhResult = await runCli(["--list-themes", "--json", "--locale", "zh"]);
    assert.equal(enResult.code, 0);
    assert.equal(zhResult.code, 0);
    assert.equal(enResult.stdout, zhResult.stdout);
    const enThemes = JSON.parse(enResult.stdout);
    const zhThemes = JSON.parse(zhResult.stdout);
    assert.deepEqual(enThemes, zhThemes);
  });

  it("rejects unknown locale value", async () => {
    const result = await runCli(["--help", "--locale", "fr"]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Unknown --locale/);
  });

  it("documents --github in help (en + zh)", async () => {
    const en = await runCli(["--help"]);
    const zh = await runCli(["--help", "--locale", "zh"]);
    assert.equal(en.code, 0);
    assert.equal(zh.code, 0);
    assert.match(en.stdout, /--github/);
    assert.match(en.stdout, /::notice::/);
    assert.match(en.stdout, /GITHUB_STEP_SUMMARY/);
    assert.match(zh.stdout, /--github/);
    assert.match(zh.stdout, /::notice::/);
    assert.match(zh.stdout, /GITHUB_STEP_SUMMARY/);
  });

  it("emits a success notice with --github", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-gh-ok-"));
    const out = join(dir, "tank.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "cli-github",
        "--source",
        "mock",
        "--theme",
        "reef",
        "--out",
        out,
        "--github",
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stderr, /::notice::cli-github · theme=reef · /);
      assert.match(result.stderr, /fish=\d+/);
      assert.match(result.stderr, /activity=\d+/);
      assert.match(result.stderr, /source=mock/);
      assert.equal(result.stdout.trim(), "");
      const svg = await readFile(out, "utf8");
      assert.match(svg, /data-user="cli-github"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("emits ::error:: on usage errors with --github", async () => {
    const result = await runCli(["generate", "--github"]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Missing --user/);
    assert.match(result.stderr, /::error::Missing --user <login>/);
    assert.doesNotMatch(result.stderr, /::notice::/);
  });

  it("keeps --json stdout parseable when combined with --github", async () => {
    const result = await runCli([
      "generate",
      "--user",
      "json-github",
      "--source",
      "mock",
      "--json",
      "--github",
    ]);
    assert.equal(result.code, 0, result.stderr);
    const json = JSON.parse(result.stdout) as {
      login: string;
      source: string;
      fishCount: number;
      totalContributions: number;
    };
    assert.equal(json.login, "json-github");
    assert.equal(json.source, "mock");
    assert.equal(typeof json.fishCount, "number");
    assert.doesNotMatch(result.stdout, /::(error|warning|notice)::/);
    assert.match(result.stderr, /::notice::json-github · theme=deep · json · fish=/);
    assert.match(result.stderr, /activity=/);
  });

  it("keeps --github annotations with --quiet (no pretty summary)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-gh-quiet-"));
    const out = join(dir, "quiet.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "quiet-github",
        "--source",
        "mock",
        "--out",
        out,
        "--quiet",
        "--github",
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stderr, /::notice::quiet-github · theme=deep · /);
      assert.doesNotMatch(result.stderr, /source=mock/);
      assert.equal(result.stdout.trim(), "");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("emits no workflow commands without --github", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-no-gh-"));
    const out = join(dir, "tank.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "no-github",
        "--source",
        "mock",
        "--out",
        out,
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.doesNotMatch(result.stdout, /::/);
      assert.doesNotMatch(result.stderr, /::/);
      assert.match(result.stderr, /source=mock/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not annotate usage errors without --github", async () => {
    const result = await runCli(["generate"]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Missing --user/);
    assert.doesNotMatch(result.stderr, /::/);
    assert.doesNotMatch(result.stdout, /::/);
  });

  it("notices successful --list-themes with --github", async () => {
    const result = await runCli(["--list-themes", "--github"]);
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(result.stdout.trim().split("\n"), [
      "deep",
      "reef",
      "midnight",
      "lagoon",
      "ember",
      "fog",
      "aurora",
    ]);
    assert.match(result.stderr, /::notice::listed 7 themes$/m);
    assert.doesNotMatch(result.stdout, /::/);
  });

  it("writes GITHUB_STEP_SUMMARY with --github", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-gh-sum-"));
    const out = join(dir, "tank.svg");
    const summary = join(dir, "step_summary.md");
    try {
      const result = await runCli(
        [
          "generate",
          "--user",
          "sum-github",
          "--source",
          "mock",
          "--out",
          out,
          "--github",
        ],
        { GITHUB_STEP_SUMMARY: summary },
      );
      assert.equal(result.code, 0, result.stderr);
      const body = await readFile(summary, "utf8");
      assert.match(body, /## contrib-aquarium/);
      assert.match(body, /\*\*User\*\*/);
      assert.match(body, /sum-github/);
      assert.match(body, /\*\*Fish\*\*/);
      assert.match(body, /\*\*Activity\*\*/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("documents --html in help (en + zh)", async () => {
    const en = await runCli(["--help"]);
    const zh = await runCli(["--help", "--locale", "zh"]);
    assert.equal(en.code, 0);
    assert.equal(zh.code, 0);
    assert.match(en.stdout, /--html \[path\]/);
    assert.match(en.stdout, /Self-contained HTML report/);
    assert.match(en.stdout, /--html and --json cannot share stdout/);
    assert.match(zh.stdout, /--html \[path\]/);
    assert.match(zh.stdout, /自包含 HTML 报告/);
    assert.match(zh.stdout, /--html 与 --json 不能同时使用/);
  });

  it("prints HTML to stdout when --html path is omitted", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-html-stdout-"));
    const out = join(dir, "tank.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "html-stdout",
        "--source",
        "mock",
        "--out",
        out,
        "--html",
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /<!DOCTYPE html>/i);
      assert.match(result.stdout, /contrib-aquarium/);
      assert.match(result.stdout, /html-stdout/);
      assert.match(result.stdout, /<svg /);
      assert.doesNotMatch(result.stdout, /cdn\.|unpkg|jsdelivr|fonts\.googleapis/i);
      assert.doesNotMatch(result.stdout, /<script[\s>]/i);
      assert.match(result.stderr, /source=mock/);
      const svg = await readFile(out, "utf8");
      assert.match(svg, /data-user="html-stdout"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writes HTML to path and does not dump it to stdout", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-html-file-"));
    const out = join(dir, "tank.svg");
    const htmlFile = join(dir, "nested", "report.html");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "html-file",
        "--source",
        "mock",
        "--theme",
        "reef",
        "--out",
        out,
        "--html",
        htmlFile,
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.equal(result.stdout.trim(), "");
      assert.match(result.stderr, /wrote html report to/);
      assert.match(result.stderr, /source=mock/);
      const html = await readFile(htmlFile, "utf8");
      assert.match(html, /<!DOCTYPE html>/i);
      assert.match(html, /html-file/);
      assert.match(html, /reef/);
      assert.match(html, /<svg /);
      const svg = await readFile(out, "utf8");
      assert.match(svg, /data-theme="reef"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("includes aurora in HTML report when --theme aurora", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-html-aurora-"));
    const out = join(dir, "tank.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "html-aurora",
        "--source",
        "mock",
        "--theme",
        "aurora",
        "--out",
        out,
        "--html",
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /aurora/);
      assert.match(result.stdout, /data-theme="aurora"/);
      const svg = await readFile(out, "utf8");
      assert.match(svg, /data-theme="aurora"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects --html together with --json", async () => {
    const result = await runCli([
      "generate",
      "--user",
      "html-json",
      "--source",
      "mock",
      "--html",
      "--json",
    ]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /cannot be combined with --json/);
    assert.doesNotMatch(result.stdout, /<!DOCTYPE html>/i);
    assert.doesNotMatch(result.stdout, /\{/);
  });

  it("rejects --html together with --json in Chinese", async () => {
    const result = await runCli([
      "generate",
      "--user",
      "html-json-zh",
      "--source",
      "mock",
      "--html",
      "--json",
      "--locale",
      "zh",
    ]);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /不能与 --json 同时使用/);
  });

  it("keeps --json stdout unchanged when --html is absent", async () => {
    const result = await runCli([
      "generate",
      "--user",
      "json-no-html",
      "--source",
      "mock",
      "--json",
    ]);
    assert.equal(result.code, 0, result.stderr);
    const json = JSON.parse(result.stdout) as { login: string; source: string };
    assert.equal(json.login, "json-no-html");
    assert.equal(json.source, "mock");
    assert.doesNotMatch(result.stdout, /<!DOCTYPE html>/i);
  });

  it("suppresses pretty summary with --html --quiet (HTML still on stdout)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-html-quiet-"));
    const out = join(dir, "quiet.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "html-quiet",
        "--source",
        "mock",
        "--out",
        out,
        "--html",
        "--quiet",
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /<!DOCTYPE html>/i);
      assert.equal(result.stderr.trim(), "");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps --github annotations with --html (annotations on stderr)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-html-gh-"));
    const out = join(dir, "tank.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "html-github",
        "--source",
        "mock",
        "--out",
        out,
        "--html",
        "--github",
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /<!DOCTYPE html>/i);
      assert.doesNotMatch(result.stdout, /::(error|warning|notice)::/);
      assert.match(result.stderr, /::notice::html-github · theme=deep · /);
      assert.match(result.stderr, /source=mock/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps --github + --quiet with --html path (no pretty line, file written)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-html-gh-quiet-"));
    const out = join(dir, "tank.svg");
    const htmlFile = join(dir, "report.html");
    const summary = join(dir, "step_summary.md");
    try {
      const result = await runCli(
        [
          "generate",
          "--user",
          "html-gh-quiet",
          "--source",
          "mock",
          "--out",
          out,
          "--html",
          htmlFile,
          "--quiet",
          "--github",
        ],
        { GITHUB_STEP_SUMMARY: summary },
      );
      assert.equal(result.code, 0, result.stderr);
      assert.equal(result.stdout.trim(), "");
      assert.match(result.stderr, /::notice::html-gh-quiet · /);
      assert.doesNotMatch(result.stderr, /source=mock/);
      assert.doesNotMatch(result.stderr, /wrote html report to/);
      const html = await readFile(htmlFile, "utf8");
      assert.match(html, /html-gh-quiet/);
      const body = await readFile(summary, "utf8");
      assert.match(body, /## contrib-aquarium/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("localizes HTML labels with --locale zh and keeps SVG --out", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-html-zh-"));
    const out = join(dir, "tank.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "html-zh",
        "--source",
        "mock",
        "--out",
        out,
        "--html",
        "--locale",
        "zh",
      ]);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /lang="zh"/);
      assert.match(result.stdout, /离线鱼缸报告/);
      assert.match(result.stderr, /source=mock/);
      const svg = await readFile(out, "utf8");
      assert.match(svg, /data-user="html-zh"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not write GITHUB_STEP_SUMMARY without --github", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-no-sum-"));
    const out = join(dir, "tank.svg");
    const summary = join(dir, "step_summary.md");
    try {
      const result = await runCli(
        [
          "generate",
          "--user",
          "no-sum",
          "--source",
          "mock",
          "--out",
          out,
        ],
        { GITHUB_STEP_SUMMARY: summary },
      );
      assert.equal(result.code, 0, result.stderr);
      await assert.rejects(readFile(summary, "utf8"), /ENOENT/);
      assert.doesNotMatch(result.stderr, /::/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
