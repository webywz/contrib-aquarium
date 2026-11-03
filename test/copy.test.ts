import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { run } from "../src/cli.ts";

function argv(...args: string[]): string[] {
  return ["node", "cli.ts", ...args];
}

async function captureIo<T>(fn: () => Promise<T>): Promise<{
  value: T;
  stdout: string;
  stderr: string;
}> {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const outWrite = process.stdout.write.bind(process.stdout);
  const errWrite = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
    stdoutChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    if (typeof rest[0] === "function") (rest[0] as () => void)();
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
    stderrChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    if (typeof rest[0] === "function") (rest[0] as () => void)();
    return true;
  }) as typeof process.stderr.write;
  const log = console.log;
  const error = console.error;
  console.log = (...parts: unknown[]) => {
    stdoutChunks.push(parts.map(String).join(" ") + "\n");
  };
  console.error = (...parts: unknown[]) => {
    stderrChunks.push(parts.map(String).join(" ") + "\n");
  };
  try {
    const value = await fn();
    return {
      value,
      stdout: stdoutChunks.join(""),
      stderr: stderrChunks.join(""),
    };
  } finally {
    process.stdout.write = outWrite;
    process.stderr.write = errWrite;
    console.log = log;
    console.error = error;
  }
}

async function runCli(
  args: string[],
  copyToClipboard?: (text: string) => boolean,
): Promise<{ status: number; stdout: string; stderr: string; calls: string[] }> {
  const calls: string[] = [];
  const deps = copyToClipboard
    ? {
        copyToClipboard: (text: string) => {
          calls.push(text);
          return copyToClipboard(text);
        },
      }
    : {};
  const captured = await captureIo(() => run(argv(...args), deps));
  return {
    status: captured.value,
    stdout: captured.stdout,
    stderr: captured.stderr,
    calls,
  };
}

describe("generate --copy", () => {
  it("copies the written SVG markup, not JSON or HTML chrome", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-copy-"));
    const out = join(dir, "tank.svg");
    try {
      const result = await runCli(
        ["generate", "--user", "copy-demo", "--source", "mock", "--out", out, "--copy", "--quiet"],
        () => true,
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.calls.length, 1);
      const copied = result.calls[0] ?? "";
      const written = await readFile(out, "utf8");
      assert.equal(copied, written);
      assert.match(copied, /<svg[\s>]/);
      assert.match(copied, /data-user="copy-demo"/);
      assert.doesNotMatch(copied, /<!DOCTYPE html>/i);
      assert.doesNotMatch(copied, /^\s*\{/);
      assert.doesNotMatch(copied, /::(error|warning|notice)/);
      assert.doesNotMatch(result.stderr, /clipboard/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("with --json still copies the SVG body, not the JSON blob", async () => {
    const result = await runCli(
      ["generate", "--user", "copy-json", "--source", "mock", "--json", "--copy"],
      () => true,
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.calls.length, 1);
    const copied = result.calls[0] ?? "";
    assert.match(copied, /<svg[\s>]/);
    assert.match(copied, /data-user="copy-json"/);
    assert.doesNotMatch(copied, /"login"/);
    assert.doesNotMatch(copied, /"fishCount"/);
    const json = JSON.parse(result.stdout) as { login: string };
    assert.equal(json.login, "copy-json");
  });

  it("with --html still copies the SVG body, not the HTML report", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-copy-html-"));
    const out = join(dir, "tank.svg");
    try {
      const result = await runCli(
        [
          "generate",
          "--user",
          "copy-html",
          "--source",
          "mock",
          "--out",
          out,
          "--html",
          "--copy",
          "--quiet",
        ],
        () => true,
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.calls.length, 1);
      const copied = result.calls[0] ?? "";
      const written = await readFile(out, "utf8");
      assert.equal(copied, written);
      assert.match(copied, /<svg[\s>]/);
      assert.doesNotMatch(copied, /<!DOCTYPE html>/i);
      assert.match(result.stdout, /<!DOCTYPE html>/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("missing clipboard is a silent skip (command still succeeds)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-copy-miss-"));
    const out = join(dir, "tank.svg");
    try {
      const result = await runCli(
        ["generate", "--user", "copy-miss", "--source", "mock", "--out", out, "--copy", "--quiet"],
        () => false,
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.calls.length, 1);
      assert.match(result.calls[0] ?? "", /<svg[\s>]/);
      assert.equal(result.stderr, "");
      assert.doesNotMatch(result.stdout, /clipboard/i);
      const svg = await readFile(out, "utf8");
      assert.match(svg, /data-user="copy-miss"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("clipboard throw is a silent skip (command still succeeds)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-copy-throw-"));
    const out = join(dir, "tank.svg");
    try {
      const result = await runCli(
        ["generate", "--user", "copy-throw", "--source", "mock", "--out", out, "--copy", "--quiet"],
        () => {
          throw new Error("clipboard exploded");
        },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, "");
      const svg = await readFile(out, "utf8");
      assert.match(svg, /data-user="copy-throw"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("without --copy does not invoke the clipboard", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aquarium-copy-off-"));
    const out = join(dir, "tank.svg");
    try {
      let called = false;
      const result = await runCli(
        ["generate", "--user", "copy-off", "--source", "mock", "--out", out, "--quiet"],
        () => {
          called = true;
          return true;
        },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(called, false);
      assert.equal(result.calls.length, 0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
