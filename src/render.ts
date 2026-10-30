import { mapAquarium } from "./mapping.js";
import { getTheme, type Theme, type ThemeName } from "./theme.js";
import type {
  Activity,
  AquariumModel,
  BubbleModel,
  FishModel,
  PlantModel,
  ReefColumn,
} from "./types.js";
import { escapeXml, formatRange } from "./util.js";

export const SVG_WIDTH = 860;
export const SVG_HEIGHT = 300;

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits).replace(/\.?0+$/, "");
}

function fishPaths(fish: FishModel): string {
  const s = fish.size;
  const eye = Math.max(1.1, s * 0.07);
  if (fish.species === "angel") {
    const body = `M ${fmt(-s * 0.1)} ${fmt(-s * 0.72)}
      C ${fmt(s * 0.55)} ${fmt(-s * 0.18)}, ${fmt(s * 0.62)} ${fmt(s * 0.16)}, ${fmt(s * 0.18)} ${fmt(s * 0.08)}
      C ${fmt(s * 0.02)} ${fmt(s * 0.7)}, ${fmt(-s * 0.18)} ${fmt(s * 0.55)}, ${fmt(-s * 0.22)} ${fmt(s * 0.08)}
      C ${fmt(-s * 0.48)} ${fmt(0)}, ${fmt(-s * 0.38)} ${fmt(-s * 0.2)}, ${fmt(-s * 0.1)} ${fmt(-s * 0.72)} Z`;
    const dorsal = `M ${fmt(-s * 0.02)} ${fmt(-s * 0.12)} L ${fmt(s * 0.08)} ${fmt(-s * 0.78)} L ${fmt(s * 0.22)} ${fmt(-s * 0.1)} Z`;
    const ventral = `M ${fmt(-s * 0.04)} ${fmt(s * 0.1)} L ${fmt(s * 0.1)} ${fmt(s * 0.7)} L ${fmt(s * 0.2)} ${fmt(s * 0.08)} Z`;
    const tail = `M ${fmt(-s * 0.22)} 0 L ${fmt(-s * 0.58)} ${fmt(-s * 0.22)} L ${fmt(-s * 0.4)} 0 L ${fmt(-s * 0.58)} ${fmt(s * 0.22)} Z`;
    return `
      <path class="wag" d="${tail}" fill="${fish.accent}" opacity="0.92"/>
      <path d="${dorsal}" fill="${fish.accent}" opacity="0.78"/>
      <path d="${ventral}" fill="${fish.accent}" opacity="0.7"/>
      <path d="${body}" fill="${fish.body}" stroke="${fish.accent}" stroke-width="0.6" stroke-opacity="0.35"/>
      <circle cx="${fmt(s * 0.22)}" cy="${fmt(-s * 0.04)}" r="${fmt(eye)}" fill="#142022"/>
      <circle cx="${fmt(s * 0.245)}" cy="${fmt(-s * 0.055)}" r="${fmt(eye * 0.32)}" fill="#f2f7f4"/>`;
  }

  if (fish.species === "koi") {
    const body = `M ${fmt(-s * 0.52)} 0
      C ${fmt(-s * 0.38)} ${fmt(-s * 0.38)}, ${fmt(s * 0.08)} ${fmt(-s * 0.4)}, ${fmt(s * 0.48)} ${fmt(-s * 0.1)}
      C ${fmt(s * 0.6)} ${fmt(-s * 0.02)}, ${fmt(s * 0.6)} ${fmt(s * 0.04)}, ${fmt(s * 0.46)} ${fmt(s * 0.12)}
      C ${fmt(s * 0.08)} ${fmt(s * 0.4)}, ${fmt(-s * 0.38)} ${fmt(s * 0.36)}, ${fmt(-s * 0.52)} 0 Z`;
    const patch = `M ${fmt(-s * 0.08)} ${fmt(-s * 0.18)}
      C ${fmt(s * 0.12)} ${fmt(-s * 0.28)}, ${fmt(s * 0.28)} ${fmt(-s * 0.08)}, ${fmt(s * 0.18)} ${fmt(s * 0.08)}
      C ${fmt(0.02)} ${fmt(s * 0.16)}, ${fmt(-s * 0.22)} ${fmt(s * 0.04)}, ${fmt(-s * 0.08)} ${fmt(-s * 0.18)} Z`;
    const tail = `M ${fmt(-s * 0.48)} 0 L ${fmt(-s * 0.92)} ${fmt(-s * 0.34)} L ${fmt(-s * 0.68)} 0 L ${fmt(-s * 0.9)} ${fmt(s * 0.32)} Z`;
    const fin = `M ${fmt(s * 0.02)} ${fmt(s * 0.08)} Q ${fmt(s * 0.12)} ${fmt(s * 0.32)} ${fmt(-s * 0.04)} ${fmt(s * 0.22)} Z`;
    return `
      <path class="wag" d="${tail}" fill="${fish.accent}" opacity="0.9"/>
      <path d="${body}" fill="${fish.body}" stroke="${fish.accent}" stroke-width="0.55" stroke-opacity="0.28"/>
      <path d="${patch}" fill="${fish.accent}" opacity="0.85"/>
      <path d="${fin}" fill="${fish.accent}" opacity="0.65"/>
      <circle cx="${fmt(s * 0.34)}" cy="${fmt(-s * 0.04)}" r="${fmt(eye)}" fill="#1a1814"/>
      <circle cx="${fmt(s * 0.365)}" cy="${fmt(-s * 0.055)}" r="${fmt(eye * 0.3)}" fill="#f7f3ea"/>`;
  }

  const body = `M ${fmt(-s * 0.5)} 0
    C ${fmt(-s * 0.28)} ${fmt(-s * 0.28)}, ${fmt(s * 0.18)} ${fmt(-s * 0.26)}, ${fmt(s * 0.46)} 0
    C ${fmt(s * 0.18)} ${fmt(s * 0.24)}, ${fmt(-s * 0.28)} ${fmt(s * 0.26)}, ${fmt(-s * 0.5)} 0 Z`;
  const tail = `M ${fmt(-s * 0.46)} 0 L ${fmt(-s * 0.82)} ${fmt(-s * 0.22)} L ${fmt(-s * 0.62)} 0 L ${fmt(-s * 0.8)} ${fmt(s * 0.2)} Z`;
  const fin = `M ${fmt(s * 0.04)} ${fmt(s * 0.02)} Q ${fmt(s * 0.1)} ${fmt(s * 0.22)} ${fmt(-s * 0.08)} ${fmt(s * 0.14)} Z`;
  return `
    <path class="wag" d="${tail}" fill="${fish.accent}"/>
    <path d="${body}" fill="${fish.body}" stroke="${fish.accent}" stroke-width="0.5" stroke-opacity="0.35"/>
    <path d="${fin}" fill="${fish.accent}" opacity="0.7"/>
    <circle cx="${fmt(s * 0.28)}" cy="${fmt(-s * 0.03)}" r="${fmt(eye)}" fill="#152022"/>
    <circle cx="${fmt(s * 0.3)}" cy="${fmt(-s * 0.045)}" r="${fmt(eye * 0.32)}" fill="#eef6f4"/>`;
}

function drawFish(fish: FishModel): string {
  const flip = fish.reverse ? ` transform="scale(-1,1)"` : "";
  const direction = fish.reverse ? "reverse" : "normal";
  return `<g class="lane" data-el="fish" data-species="${fish.species}" style="animation-duration:${fmt(fish.duration, 2)}s;animation-delay:-${fmt(fish.delay, 2)}s;animation-direction:${direction};--rest-x:${fmt(fish.restX, 1)}px;--wag:${fmt(fish.wag, 2)}s">
    <g transform="translate(0,${fmt(fish.y, 1)})">
      <g class="bob" style="animation-duration:${fmt(fish.bob, 2)}s;animation-delay:-${fmt(fish.delay % fish.bob, 2)}s">
        <g${flip}>
          ${fishPaths(fish)}
        </g>
      </g>
    </g>
  </g>`;
}

function bladePath(x: number, height: number, lean: number, width: number): string {
  const top = 268 - height;
  return `M ${fmt(x, 1)} 268
    Q ${fmt(x + lean * 0.45, 1)} ${fmt(268 - height * 0.38, 1)} ${fmt(x - lean * 0.15, 1)} ${fmt(268 - height * 0.68, 1)}
    Q ${fmt(x + lean, 1)} ${fmt(top + 8, 1)} ${fmt(x + lean * 0.2, 1)} ${fmt(top, 1)}
    Q ${fmt(x + lean * 0.55 + width, 1)} ${fmt(268 - height * 0.62, 1)} ${fmt(x + width * 0.35, 1)} 268 Z`;
}

function drawPlant(plant: PlantModel, theme: Theme): string {
  const color = theme.kelp[plant.palette % theme.kelp.length];
  const blades: string[] = [];
  for (let i = 0; i < plant.blades; i++) {
    const lean = (i - (plant.blades - 1) / 2) * 16 + (i % 2 === 0 ? 6 : -4);
    const h = plant.height * (0.72 + (i % 3) * 0.12);
    const w = 7 + (i % 3) * 2.5;
    blades.push(
      `<path d="${bladePath(plant.x + i * 3.2, h, lean, w)}" fill="${color}" opacity="${fmt(0.62 + i * 0.08, 2)}"/>`,
    );
  }
  return `<g class="sway" data-el="plant" style="transform-origin:${fmt(plant.x, 1)}px 268px;animation-duration:${fmt(plant.duration, 2)}s;animation-delay:-${fmt(plant.delay, 2)}s">${blades.join("")}</g>`;
}

function drawBubble(bubble: BubbleModel): string {
  return `<g class="rise" data-el="bubble" style="animation-duration:${fmt(bubble.duration, 2)}s;animation-delay:-${fmt(bubble.delay, 2)}s;transform-origin:${fmt(bubble.x, 1)}px ${fmt(bubble.startY, 1)}px">
    <circle cx="${fmt(bubble.x, 1)}" cy="${fmt(bubble.startY, 1)}" r="${fmt(bubble.r, 2)}" fill="rgba(186,226,232,0.22)" stroke="rgba(226,248,252,0.45)" stroke-width="0.6"/>
    <circle cx="${fmt(bubble.x - bubble.r * 0.28, 1)}" cy="${fmt(bubble.startY - bubble.r * 0.3, 1)}" r="${fmt(Math.max(0.4, bubble.r * 0.28), 2)}" fill="rgba(255,255,255,0.45)"/>
  </g>`;
}

function drawReef(columns: ReefColumn[], theme: Theme): string {
  return columns
    .map((col) => {
      const cx = col.x + col.width / 2;
      const pebbles = [
        `<ellipse cx="${fmt(cx, 2)}" cy="264.5" rx="${fmt(Math.max(2.2, col.width * 0.72), 2)}" ry="${fmt(Math.max(2, col.height * 0.34), 2)}" fill="${theme.reef[0]}"/>`,
        `<ellipse cx="${fmt(cx + col.width * 0.18, 2)}" cy="${fmt(263.2 - col.height * 0.22, 2)}" rx="${fmt(Math.max(1.4, col.width * 0.4), 2)}" ry="${fmt(Math.max(1.5, col.height * 0.28), 2)}" fill="${theme.reef[1]}"/>`,
      ];
      if (col.height > 12) {
        pebbles.push(
          `<ellipse cx="${fmt(cx - col.width * 0.12, 2)}" cy="${fmt(261.5 - col.height * 0.42, 2)}" rx="${fmt(col.width * 0.28, 2)}" ry="${fmt(col.height * 0.22, 2)}" fill="${theme.reef[2]}"/>`,
        );
      }
      return `<g opacity="${fmt(col.opacity, 2)}">${pebbles.join("")}</g>`;
    })
    .join("");
}

function sourceNote(source: Activity["source"]): string {
  if (source === "graphql") return "GitHub contributions";
  if (source === "events") return "seeded from public events";
  return "demo pattern from username";
}

function caption(activity: Activity, model: AquariumModel, theme: Theme): string {
  const login = escapeXml(activity.login.toUpperCase());
  const tracking = activity.login.length > 16 ? "0.08em" : "0.22em";
  const total = activity.totalContributions.toLocaleString("en-US");
  const range = escapeXml(formatRange(activity.range.from, activity.range.to));
  const note = escapeXml(sourceNote(activity.source));
  const extras =
    model.streak > 1 ? `  ·  ${model.streak}-day streak` : "";
  const sourceLabel =
    activity.source === "graphql"
      ? ""
      : `<text x="828" y="32" fill="${theme.caption.note}" font-size="8" font-family="Georgia, serif" text-anchor="end">${note}</text>`;
  return `
    <text x="32" y="268" fill="${theme.caption.title}" font-size="13" font-family="Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif" letter-spacing="${tracking}">${login}</text>
    <text x="32" y="282" fill="${theme.caption.meta}" font-size="9.5" font-family="Georgia, 'Iowan Old Style', serif">${total} contributions  ·  ${range}${extras}</text>
    ${sourceLabel}`;
}

function defs(theme: Theme): string {
  const [w0, w1, w2] = theme.water;
  const [s0, s1] = theme.sand;
  return `<defs>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${w0}"/>
      <stop offset="38%" stop-color="${w1}"/>
      <stop offset="100%" stop-color="${w2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="46%" cy="8%" r="72%">
      <stop offset="0%" stop-color="${theme.glow.color}" stop-opacity="0.38"/>
      <stop offset="42%" stop-color="${theme.glow.mid}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#061018" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${s0}"/>
      <stop offset="100%" stop-color="${s1}"/>
    </linearGradient>
    <linearGradient id="film" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.film}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${theme.film}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.glass}" stop-opacity="0.16"/>
      <stop offset="18%" stop-color="${theme.glass}" stop-opacity="0"/>
      <stop offset="82%" stop-color="${theme.glass}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${theme.glass}" stop-opacity="0.12"/>
    </linearGradient>
    <filter id="soft" x="-8%" y="-8%" width="116%" height="116%">
      <feGaussianBlur stdDeviation="0.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="haze">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.07"/>
      </feComponentTransfer>
    </filter>
    <clipPath id="tank">
      <rect x="10" y="10" width="840" height="280" rx="22" ry="22"/>
    </clipPath>
  </defs>`;
}

function styles(model: AquariumModel): string {
  const sway = (2.2 + model.turbulence * 2.4).toFixed(2);
  return `<style>
    .lane { animation-name: swim; animation-timing-function: linear; animation-iteration-count: infinite; }
    .bob { animation-name: bob; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
    .wag { transform-box: fill-box; transform-origin: 90% 50%; animation-name: wag; animation-duration: var(--wag, 0.4s); animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
    .sway { transform-box: fill-box; transform-origin: 50% 100%; animation: sway ${sway}s ease-in-out infinite; }
    .rise { animation-name: rise; animation-timing-function: linear; animation-iteration-count: infinite; }
    .ray { animation: pulse 5.5s ease-in-out infinite; }
    .shimmer { animation: shimmer 6s ease-in-out infinite; }
    @keyframes swim {
      from { transform: translateX(-130px); }
      to { transform: translateX(990px); }
    }
    @keyframes bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-7px); }
    }
    @keyframes wag {
      0%, 100% { transform: rotate(7deg); }
      50% { transform: rotate(-12deg); }
    }
    @keyframes sway {
      0%, 100% { transform: rotate(-${fmt(1.6 + model.turbulence, 1)}deg); }
      50% { transform: rotate(${fmt(2.4 + model.turbulence * 1.4, 1)}deg); }
    }
    @keyframes rise {
      0% { transform: translate(0, 0); opacity: 0.15; }
      12% { opacity: 0.7; }
      100% { transform: translate(8px, -240px); opacity: 0; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.09; }
      50% { opacity: 0.2; }
    }
    @keyframes shimmer {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 0.7; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lane { animation: none !important; transform: translateX(var(--rest-x, 220px)); }
      .bob, .wag, .sway, .rise, .ray, .shimmer { animation: none !important; }
    }
  </style>`;
}

function rocks(theme: Theme): string {
  const [a, b, c] = theme.rock;
  return `
    <ellipse cx="118" cy="266" rx="38" ry="11" fill="${a}" opacity="0.85"/>
    <ellipse cx="108" cy="258" rx="22" ry="14" fill="${b}"/>
    <ellipse cx="132" cy="260" rx="14" ry="9" fill="${c}"/>
    <ellipse cx="742" cy="268" rx="46" ry="12" fill="${a}" opacity="0.8"/>
    <ellipse cx="728" cy="258" rx="20" ry="13" fill="${b}"/>
    <ellipse cx="758" cy="261" rx="16" ry="10" fill="${c}"/>
    <ellipse cx="430" cy="270" rx="18" ry="6" fill="${b}" opacity="0.7"/>`;
}

function rays(theme: Theme): string {
  const [r0, r1, r2] = theme.ray;
  return `
    <g class="ray" opacity="0.14">
      <polygon points="210,12 268,12 318,268 168,268" fill="${r0}"/>
    </g>
    <g class="ray" opacity="0.1" style="animation-delay:-2.4s">
      <polygon points="470,12 510,12 548,268 430,268" fill="${r1}"/>
    </g>
    <g class="ray" opacity="0.08" style="animation-delay:-4.1s">
      <polygon points="620,12 648,12 700,268 560,268" fill="${r2}"/>
    </g>`;
}

function surface(): string {
  return `
    <path fill="url(#film)" d="M10,10 H850 V40 Q645,52 430,34 T10,42 Z">
      <animate attributeName="d" dur="8s" repeatCount="indefinite"
        values="M10,10 H850 V40 Q645,52 430,34 T10,42 Z;
                M10,10 H850 V38 Q645,28 430,44 T10,36 Z;
                M10,10 H850 V40 Q645,52 430,34 T10,42 Z"/>
    </path>
    <path class="shimmer" fill="none" stroke="rgba(186,232,228,0.45)" stroke-width="1.1" d="M24,22 Q140,14 250,24 T480,20 T836,26"/>`;
}

/** Presentation size for README embeds. viewBox stays at SVG_WIDTH × SVG_HEIGHT. */
export function presentationSize(width: number = SVG_WIDTH): { width: number; height: number } {
  const w = width;
  const h = Math.round((w * SVG_HEIGHT) / SVG_WIDTH);
  return { width: w, height: h };
}

export function renderAquarium(
  activity: Activity,
  themeName: ThemeName = "deep",
  width?: number,
): string {
  const theme = getTheme(themeName);
  const model = mapAquarium(activity, themeName);
  const size = presentationSize(width ?? SVG_WIDTH);
  const label = escapeXml(
    `GitHub contribution aquarium for ${activity.login} — ${activity.totalContributions} contributions`,
  );

  const plantsBack = model.plants
    .filter((_, i) => i % 2 === 0)
    .map((p) => drawPlant(p, theme))
    .join("");
  const plantsFront = model.plants
    .filter((_, i) => i % 2 === 1)
    .map((p) => drawPlant(p, theme))
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${label}" data-user="${escapeXml(activity.login)}" data-source="${activity.source}" data-total="${activity.totalContributions}" data-theme="${theme.name}">
  <title>${label}</title>
  ${defs(theme)}
  ${styles(model)}
  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" rx="24" fill="${theme.water[2]}"/>
  <g clip-path="url(#tank)">
    <rect x="10" y="10" width="840" height="280" fill="url(#water)"/>
    <rect x="10" y="10" width="840" height="280" fill="url(#glow)"/>
    ${rays(theme)}
    <rect x="10" y="10" width="840" height="280" filter="url(#haze)" opacity="0.55"/>
    ${plantsBack}
    <path d="M10,252 C80,246 160,258 250,250 C360,240 470,258 560,249 C670,238 760,256 850,248 L850,290 L10,290 Z" fill="url(#sand)"/>
    <path d="M10,252 C80,246 160,258 250,250 C360,240 470,258 560,249 C670,238 760,256 850,248" fill="none" stroke="rgba(210,190,150,0.22)" stroke-width="1.2"/>
    ${drawReef(model.reef, theme)}
    ${rocks(theme)}
    <g filter="url(#soft)">
      ${model.fish.map(drawFish).join("")}
    </g>
    ${plantsFront}
    ${model.bubbles.map(drawBubble).join("")}
    ${surface()}
    <rect x="10" y="10" width="840" height="280" fill="url(#glass)"/>
    ${caption(activity, model, theme)}
  </g>
  <rect x="10.6" y="10.6" width="838.8" height="278.8" rx="21" fill="none" stroke="rgba(198,176,122,0.55)" stroke-width="1.4"/>
  <rect x="13" y="13" width="834" height="274" rx="19" fill="none" stroke="rgba(214,236,232,0.16)" stroke-width="0.8"/>
</svg>
`;
}

export function countSvgElements(svg: string, kind: "fish" | "plant" | "bubble"): number {
  const matches = svg.match(new RegExp(`data-el="${kind}"`, "g"));
  return matches?.length ?? 0;
}
