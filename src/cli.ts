#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { generateAquarium } from "./generate.js";
import { resolveSvgDisplaySize } from "./render.js";
import { parseTheme, THEME_NAMES } from "./theme.js";
import { readPackageVersion } from "./util.js";
import { currentStreak, flattenDays, mapBubbleCount, mapFishCount, mapPlantCount, recentTotal } from "./mapping.js";
import type { LoadSource } from "./types.js";
import { getErrorMessage, parseLocale, type Locale } from "./locale.js";

type FlagMap = Record<string, string | boolean>;

/** Usage / argv errors — matches other webywz CLIs that reserve 2 for usage. */
const USAGE_EXIT = 2;

const BOOLEAN_FLAGS = new Set(["help", "version", "quiet", "static", "no-animate", "json", "list-themes"]);
const VALUE_FLAGS = new Set(["user", "out", "source", "theme", "width", "height", "token", "locale"]);

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
      throw new Error(`__UNEXPECTED_ARG__:${arg}`);
    }
    if (!arg.startsWith("--") || arg === "--") {
      throw new Error(`__UNKNOWN_OPTION__:${arg}`);
    }
    const key = arg.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      flags[key] = true;
      continue;
    }
    if (!VALUE_FLAGS.has(key)) {
      throw new Error(`__UNKNOWN_OPTION__:${arg}`);
    }
    const next = args[i + 1];
    if (!next || next.startsWith("-")) {
      throw new Error(`__MISSING_VALUE__:${key}`);
    }
    flags[key] = next;
    i += 1;
  }
  return { command, flags };
}

function help(locale: Locale): string {
  const version = readPackageVersion();
  if (locale === "zh") {
    return `contrib-aquarium ${version}
将 GitHub 年度贡献转化成活体 SVG 鱼缸。

用法:
  contrib-aquarium generate --user <login> [--out aquarium.svg]
                            [--source auto|graphql|events|mock]
                            [--theme deep|reef|midnight|lagoon|ember|fog]
                            [--width <px>] [--height <px>]
                            [--static | --no-animate]
                            [--json]
                            [--token <gh_token>]
                            [--locale <en|zh>]
                            [--quiet]
  contrib-aquarium --list-themes [--json] [--locale <en|zh>]

选项:
  --user         GitHub 用户名（必填）
  --out          输出路径（默认 aquarium.svg）
  --source       数据源: auto（默认）、graphql、events 或 mock
  --theme        配色主题: deep（默认）、reef、midnight、lagoon、ember 或 fog
  --width        SVG 显示宽度（px，默认 860）；viewBox 保持 860×300
  --height       SVG 显示高度（px，默认与 --width 等比）
  --static       移除动画，鱼和植物静止（同 --no-animate）
  --no-animate   移除动画，鱼和植物静止（同 --static）
  --json         打印 JSON 摘要到标准输出而非 SVG；与 --out 一起使用时写入文件
  --token        GitHub token；回退到 GITHUB_TOKEN / GH_TOKEN
  --locale       界面语言: en（默认）或 zh
  --quiet        禁用成功摘要行
  --list-themes  打印可用主题名称（每行一个；加 --json 则输出 JSON 数组）
  --help         显示帮助
  --version      打印版本

数据源（auto 自动回退）:
  1. GraphQL contributionsCollection   需 token，完整年历
  2. Public events feed                公开事件流，无需 token
  3. Deterministic mock from username  确定性演示，总能用

SVG 自包含（CSS + SMIL），可作为图片直接嵌入 README。
用 --width 缩窄嵌入宽度而不挤扁鱼。
用 --static 输出静态图片（打印或邮件）。
用 --json 输出机器可读摘要（徽章 / CI 管道）。

JSON 输出示例:
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
  return `contrib-aquarium ${version}
Turn a GitHub year into a living SVG aquarium.

Usage:
  contrib-aquarium generate --user <login> [--out aquarium.svg]
                            [--source auto|graphql|events|mock]
                            [--theme deep|reef|midnight|lagoon|ember|fog]
                            [--width <px>] [--height <px>]
                            [--static | --no-animate]
                            [--json]
                            [--token <gh_token>]
                            [--locale <en|zh>]
                            [--quiet]
  contrib-aquarium --list-themes [--json] [--locale <en|zh>]

Options:
  --user         GitHub login (required)
  --out          Output path (default: aquarium.svg)
  --source       Data source: auto (default), graphql, events, or mock
  --theme        Color theme: deep (default), reef, midnight, lagoon, ember, or fog
  --width        SVG display width in px (default: 860); viewBox stays 860×300
  --height       SVG display height in px (default: proportional to --width)
  --static       Strip animations; fish and plants rest (same as --no-animate)
  --no-animate   Strip animations; fish and plants rest (same as --static)
  --json         Print JSON summary to stdout instead of SVG; writes to file with --out
  --token        GitHub token; falls back to GITHUB_TOKEN / GH_TOKEN
  --locale       Interface language: en (default) or zh
  --quiet        Suppress the success summary line
  --list-themes  Print available theme names (one per line; with --json: JSON array)
  --help         Show this message
  --version      Print version

Data sources (auto fallback):
  1. GraphQL contributionsCollection   requires a token, full last-year calendar
  2. Public events feed                recent activity, no token required
  3. Deterministic mock from username  always works; offline demos

The SVG is self-contained (CSS + SMIL). Drop it in a README as an image.
Use --width for narrower README embeds without squashing the fish.
Use --static when you need a still image (e.g. for printing or email).
Use --json for badge/CI pipelines.

Example JSON output:
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
  throw new Error(`__UNKNOWN_SOURCE__:${value}`);
}

function parsePositiveNumber(flag: string, value: string | boolean | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`__MISSING_VALUE__:${flag}`);
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`__INVALID_NUMBER__:${flag}:${value}`);
  }
  return n;
}

function extractLocale(argv: string[]): Locale {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--locale" && i + 1 < argv.length) {
      const value = argv[i + 1];
      if (value === "en" || value === "zh") {
        return value;
      }
    }
  }
  return "en";
}

async function run(argv: string[]): Promise<number> {
  const locale = extractLocale(argv);
  let parsed: { command: string | undefined; flags: FlagMap };
  try {
    parsed = parseArgs(argv);
    parseLocale(parsed.flags.locale);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.startsWith("__UNEXPECTED_ARG__:")) {
      console.error(getErrorMessage(locale, "unexpectedArg", msg.slice(19)));
    } else if (msg.startsWith("__UNKNOWN_OPTION__:")) {
      console.error(getErrorMessage(locale, "unknownOption", msg.slice(19)));
    } else if (msg.startsWith("__MISSING_VALUE__:")) {
      console.error(getErrorMessage(locale, "missingValue", msg.slice(18)));
    } else {
      console.error(msg);
    }
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
    console.log(help(locale));
    return 0;
  }
  if (command !== "generate") {
    console.error(getErrorMessage(locale, "unknownCommand", command));
    return USAGE_EXIT;
  }

  const user = asString(flags.user);
  if (!user) {
    console.error(getErrorMessage(locale, "missingUser"));
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
      const jsonOutput = JSON.stringify(summary, null, 2);
      
      // If --out is provided with --json, write JSON to file with silent stdout
      if (flags.out) {
        const jsonOutPath = resolve(asString(flags.out)!);
        await mkdir(dirname(jsonOutPath), { recursive: true });
        await writeFile(jsonOutPath, jsonOutput + "\n", "utf8");
        return 0;
      }
      
      // Otherwise, print to stdout as before
      console.log(jsonOutput);
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
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.startsWith("__UNKNOWN_SOURCE__:")) {
      console.error(getErrorMessage(locale, "unknownSource", msg.slice(19)));
    } else if (msg.startsWith("__INVALID_NUMBER__:")) {
      const parts = msg.slice(19).split(":");
      const flag = parts[0];
      const value = parts[1] || "";
      console.error(
        getErrorMessage(locale, flag === "width" ? "invalidWidth" : "invalidHeight", value),
      );
    } else {
      console.error(msg);
    }
    return 1;
  }
}

const exitCode = await run(process.argv);
process.exit(exitCode);
