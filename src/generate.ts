import { loadActivity } from "./activity.js";
import { renderAquarium } from "./render.js";
import type { GenerateOptions, GenerateResult } from "./types.js";

export async function generateAquarium(
  options: GenerateOptions,
): Promise<GenerateResult> {
  const activity = await loadActivity(options);
  const svg = renderAquarium(activity, options.theme ?? "deep", {
    width: options.width,
    height: options.height,
  });
  return { svg, activity };
}
