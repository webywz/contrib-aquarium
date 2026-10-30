import { appendFileSync } from "node:fs";

/** Escape payload text for GitHub Actions workflow command messages. */
export function escapeData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/** Escape workflow command property values (file, title, …). */
export function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

export type AnnotationType = "error" | "warning" | "notice";

/** Format a single workflow command (`::error::…` / `::notice::…`). */
export function annotation(
  type: AnnotationType,
  message: string,
  props: { file?: string; line?: number; title?: string } = {},
): string {
  const parts: string[] = [];
  if (props.file) parts.push(`file=${escapeProperty(props.file)}`);
  if (props.line !== undefined && Number.isFinite(props.line)) {
    parts.push(`line=${Math.max(1, Math.trunc(props.line))}`);
  }
  if (props.title) parts.push(`title=${escapeProperty(props.title)}`);
  const meta = parts.length > 0 ? ` ${parts.join(",")}` : "";
  return `::${type}${meta}::${escapeData(message)}`;
}

export type GenerateSummary = {
  login: string;
  theme: string;
  source: string;
  /** Output path, or `"json"` in `--json` mode. */
  output: string;
  fishCount: number;
  totalContributions: number;
};

export function formatGenerateNotice(summary: GenerateSummary): string {
  return `${summary.login} · theme=${summary.theme} · ${summary.output} · fish=${summary.fishCount} · activity=${summary.totalContributions}`;
}

export function formatThemesNotice(count: number, json: boolean): string {
  return `listed ${count} themes${json ? " (json)" : ""}`;
}

/** Short Markdown Job Summary for a successful generate. */
export function formatGenerateStepSummary(summary: GenerateSummary): string {
  return [
    "## contrib-aquarium",
    "",
    "| | |",
    "| --- | --- |",
    `| **User** | \`${summary.login}\` |`,
    `| **Theme** | \`${summary.theme}\` |`,
    `| **Source** | \`${summary.source}\` |`,
    `| **Output** | \`${summary.output}\` |`,
    `| **Fish** | ${summary.fishCount} |`,
    `| **Activity** | ${summary.totalContributions} |`,
    "",
  ].join("\n");
}

/** Short Markdown Job Summary for `--list-themes`. */
export function formatThemesStepSummary(
  themes: readonly string[],
  json: boolean,
): string {
  const listed = themes.map((name) => `\`${name}\``).join(", ");
  return [
    "## contrib-aquarium",
    "",
    `Listed **${themes.length}** themes${json ? " (JSON)" : ""}: ${listed}`,
    "",
  ].join("\n");
}

/**
 * Append a concise Job Summary when running inside Actions (`GITHUB_STEP_SUMMARY`).
 * No-op when the env var is unset.
 */
export function appendGitHubStepSummary(markdown: string): void {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  const body = markdown.endsWith("\n") ? markdown : `${markdown}\n`;
  appendFileSync(path, body, "utf8");
}
