#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { generateAquarium } from "./generate.js";
import { resolveSvgDisplaySize } from "./render.js";
import { parseTheme } from "./theme.js";
import { readPackageVersion } from "./util.js";
import type { LoadSource } from "./types.js";

type FlagMap = Record<string, string | boolean>;

/** Usage / argv errors — matches other webywz CLIs that reserve 2 for usage. */
const USAGE_EXIT = 2;

const BOOLEAN_FLAGS = new Set(["help", "version", "quiet"]);
const VALUE_FLAGS = new Set(["user", "out", "source", "theme", "width", "height", "token"]);

function parseArgs(argv: string[]): { command: string | undefined; flags: FlagMap } {
  const args = argv.slice(2);
  const command = args[0]?.startsWith("-") ? undefined : args[0];
  const flags: FlagMap = {};
  const start = command ? 1 : 0;
  for (let i = start; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      flags.help = true;
      continue;
    }
    if (arg === "-v" || arg === "--version") {
      flags.version = true;
      continue;
    }
    if (arg === "-q" || arg === "--quiet") {
      flags.quiet = true;
      continue;
    }
    if (!arg.startsWith("-")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    if (!arg.startsWith("--") || arg === "--") {
      throw new Error(`Unknown option: ${arg}`);
    }
    const key = arg.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      flags[key] = true;
      continue;
    }
    if (!VALUE_FLAGS.has(key)) {
      throw new Error(`Unknown option: ${arg}`);
    }
    const next = args[i + 1];
    if (!next || next.startsWith("-")) {
      throw new Error(`Missing value for --${key}`);
    }
    flags[key] = next;
    i += 1;
  }
  return { command, flags };
}

function help(): string {
  return `contrib-aquarium ${readPackageVersion()}
Turn a GitHub year into a living SVG aquarium.

Usage:
  contrib-aquarium generate --user <login> [--out aquarium.svg]
                            [--source auto|graphql|events|mock]
                            [--theme deep|reef|midnight]
                            [--width <px>] [--height <px>]
                            [--token <gh_token>]
                            [--quiet]

Options:
  --user      GitHub login (required)
  --out       Output path (default: aquarium.svg)
  --source    auto (default), graphql, events, or mock
  --theme     Color theme: deep (default), reef, or midnight
  --width     SVG display width in px (default: 860); viewBox stays 860×300
  --height    SVG display height in px (default: proportional to --width)
  --token     GitHub token; falls back to GITHUB_TOKEN / GH_TOKEN
  --quiet     Suppress the success summary line
  --help      Show this message
  --version   Print version

Data sources (auto):
  1. GraphQL contributionsCollection   requires a token, full last-year calendar
  2. Public events feed                recent activity, no token required
  3. Deterministic mock from username  always works; offline demos

The SVG is self-contained (CSS + SMIL). Drop it in a README as an image.
Use --width for narrower README embeds without squashing the fish.
`;
}

function asString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseSource(value: string | boolean | undefined): LoadSource {
  if (value === undefined || value === true) return "auto";
  if (value === "auto" || value === "graphql" || value === "events" || value === "mock") {
    return value;
  }
  throw new Error(`Unknown --source "${value}". Use auto, graphql, events, or mock.`);
}

function parsePositiveNumber(flag: string, value: string | boolean | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`Missing value for --${flag}`);
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid --${flag} "${value}". Use a positive number.`);
  }
  return n;
}

async function run(argv: string[]): Promise<number> {
  let parsed: { command: string | undefined; flags: FlagMap };
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return USAGE_EXIT;
  }

  const { command, flags } = parsed;
  if (flags.version) {
    console.log(readPackageVersion());
    return 0;
  }
  if (flags.help || !command) {
    console.log(help());
    return 0;
  }
  if (command !== "generate") {
    console.error(`Unknown command "${command}". Try --help.`);
    return USAGE_EXIT;
  }

  const user = asString(flags.user);
  if (!user) {
    console.error("Missing --user <login>");
    return USAGE_EXIT;
  }

  const out = resolve(asString(flags.out) ?? "aquarium.svg");
  const quiet = Boolean(flags.quiet);
  try {
    const theme = parseTheme(asString(flags.theme));
    const width = parsePositiveNumber("width", flags.width);
    const height = parsePositiveNumber("height", flags.height);
    const { svg, activity } = await generateAquarium({
      user,
      token: asString(flags.token),
      source: parseSource(flags.source),
      theme,
      width,
      height,
    });
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, svg, "utf8");
    if (!quiet) {
      const size = resolveSvgDisplaySize({ width, height });
      console.error(
        `${activity.login} · source=${activity.source} · theme=${theme} · ${size.width}×${size.height} · ${out}`,
      );
    }
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  }
}

const exitCode = await run(process.argv);
process.exit(exitCode);
