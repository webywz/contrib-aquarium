#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { generateAquarium } from "./generate.js";
import { resolveSvgDisplaySize } from "./render.js";
import { parseTheme, THEME_NAMES } from "./theme.js";
import { readPackageVersion } from "./util.js";
import { currentStreak, flattenDays, mapBubbleCount, mapFishCount, mapPlantCount, recentTotal } from "./mapping.js";
import type { LoadSource } from "./types.js";

type FlagMap = Record<string, string | boolean>;

/** Usage / argv errors — matches other webywz CLIs that reserve 2 for usage. */
const USAGE_EXIT = 2;

const BOOLEAN_FLAGS = new Set(["help", "version", "quiet", "static", "no-animate", "json", "list-themes"]);
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
将 GitHub 年度贡献转化成活体 SVG 鱼缸。

Usage:
  contrib-aquarium generate --user <login> [--out aquarium.svg]
                            [--source auto|graphql|events|mock]
                            [--theme deep|reef|midnight|lagoon|ember|fog]
                            [--width <px>] [--height <px>]
                            [--static | --no-animate]
                            [--json]
                            [--token <gh_token>]
                            [--quiet]
  contrib-aquarium --list-themes [--json]

Options:
  --user         GitHub login (required) | GitHub 用户名（必填）
  --out          Output path (default: aquarium.svg) | 输出路径（默认 aquarium.svg）
  --source       auto (default), graphql, events, or mock | 数据源
  --theme        Color theme: deep (default), reef, midnight, lagoon, ember, or fog | 配色主题
  --width        SVG display width in px (default: 860); viewBox stays 860×300 | SVG 显示宽度
  --height       SVG display height in px (default: proportional to --width) | SVG 显示高度
  --static       Strip animations; fish and plants rest (same as --no-animate) | 移除动画
  --no-animate   Strip animations; fish and plants rest (same as --static) | 移除动画
  --json         Print JSON summary to stdout instead of SVG (--out is ignored)
                 打印 JSON 摘要到标准输出而非 SVG（忽略 --out）
  --token        GitHub token; falls back to GITHUB_TOKEN / GH_TOKEN | GitHub token
  --quiet        Suppress the success summary line | 禁用成功摘要行
  --list-themes  Print available theme names (one per line; with --json: JSON array)
                 打印可用主题名称（每行一个；加 --json 则输出 JSON 数组）
  --help         Show this message | 显示帮助
  --version      Print version | 打印版本

Data sources (auto) | 数据源（自动回退）:
  1. GraphQL contributionsCollection   requires a token, full last-year calendar | 需 token，完整年历
  2. Public events feed                recent activity, no token required | 公开事件流，无需 token
  3. Deterministic mock from username  always works; offline demos | 确定性演示，总能用

The SVG is self-contained (CSS + SMIL). Drop it in a README as an image.
Use --width for narrower README embeds without squashing the fish.
Use --static when you need a still image (e.g. for printing or email).
Use --json for badge/CI pipelines.

SVG 自包含（CSS + SMIL），可作为图片直接嵌入 README。
用 --width 缩窄嵌入宽度而不挤扁鱼。
用 --static 输出静态图片（打印或邮件）。
用 --json 输出机器可读摘要（徽章 / CI 管道）。

Example JSON output | JSON 输出示例:
  {
    "login": "webywz",
    "name": null,
    "totalContributions": 1234,
    "source": "graphql",
    "range": { "from": "2025-10-31", "to": "2026-10-30" },
    "streak": 42,
    "activeDays": 256,
    "recent14": 89,
    "fishCount": 12,
    "plantCount": 11,
    "bubbleCount": 15
  }
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
  if (flags["list-themes"]) {
    if (flags.json) {
      console.log(JSON.stringify([...THEME_NAMES]));
    } else {
      for (const theme of THEME_NAMES) {
        console.log(theme);
      }
    }
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
  const static_mode = Boolean(flags.static || flags["no-animate"]);
  const json_mode = Boolean(flags.json);

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
      static: static_mode,
    });

    if (json_mode) {
      const days = flattenDays(activity);
      const dayCount = Math.max(days.length, 1);
      const activeDays = days.filter((day) => day.count > 0).length;
      const streak = currentStreak(days, activity.range.to);
      const recent14 = recentTotal(days, 14);
      const fishCount = mapFishCount(activity.totalContributions);
      const plantCount = mapPlantCount(streak, activeDays / dayCount);
      const bubbleCount = mapBubbleCount(recent14);

      const summary = {
        login: activity.login,
        name: activity.name,
        totalContributions: activity.totalContributions,
        source: activity.source,
        range: activity.range,
        streak,
        activeDays,
        recent14,
        fishCount,
        plantCount,
        bubbleCount,
      };
      console.log(JSON.stringify(summary, null, 2));
      return 0;
    }

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
