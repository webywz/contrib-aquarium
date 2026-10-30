import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tsxBin = join(root, "node_modules", ".bin", "tsx");

async function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const child = spawn(tsxBin, ["src/cli.ts", ...args], {
    cwd: root,
    env: { ...process.env, GITHUB_TOKEN: "", GH_TOKEN: "" },
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
  it("prints help", async () => {
    const result = await runCli(["--help"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /contrib-aquarium/);
    assert.match(result.stdout, /--user/);
    assert.match(result.stdout, /GraphQL/);
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
      const svg = await readFile(out, "utf8");
      assert.match(svg, /<svg /);
      assert.match(svg, /data-user="cli-demo"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a missing user", async () => {
    const result = await runCli(["generate"]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Missing --user/);
  });

  it("documents --theme in help", async () => {
    const result = await runCli(["--help"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /--theme/);
    assert.match(result.stdout, /reef/);
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
  });

  it("writes a custom-width aquarium", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-width-"));
    const out = join(dir, "wide.svg");
    try {
      const result = await runCli([
        "generate",
        "--user",
        "cli-width",
        "--source",
        "mock",
        "--width",
        "720",
        "--theme",
        "midnight",
        "--out",
        out,
      ]);
      assert.equal(result.code, 0, result.stderr);
      const svg = await readFile(out, "utf8");
      assert.match(svg, /width="720"/);
      assert.match(svg, /height="251"/);
      assert.match(svg, /viewBox="0 0 860 300"/);
      assert.match(svg, /data-theme="midnight"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects missing, non-integer, and non-positive --width", async () => {
    for (const args of [
      ["generate", "--user", "x", "--source", "mock", "--width"],
      ["generate", "--user", "x", "--source", "mock", "--width", "abc"],
      ["generate", "--user", "x", "--source", "mock", "--width", "0"],
      ["generate", "--user", "x", "--source", "mock", "--width", "-12"],
      ["generate", "--user", "x", "--source", "mock", "--width", "12.5"],
    ]) {
      const result = await runCli(args);
      assert.equal(result.code, 1, args.join(" "));
      assert.match(result.stderr, /--width/);
    }
  });

});
