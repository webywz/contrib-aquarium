import { loadActivity } from "./activity.js";
import { renderAquarium } from "./render.js";
import type { GenerateOptions, GenerateResult } from "./types.js";

export async function generateAquarium(
  options: GenerateOptions,
): Promise<GenerateResult> {
  const activity = await loadActivity(options);
  const svg = renderAquarium(activity);
  return { svg, activity };
}
