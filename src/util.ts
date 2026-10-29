export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("pick() called with an empty list");
  }
  return items[Math.floor(rng() * items.length) % items.length];
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function utcIsoDate(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

export function parseUtcDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

export function weekdayUtc(iso: string): number {
  return parseUtcDate(iso).getUTCDay();
}

export function formatRange(from: string, to: string): string {
  const a = parseUtcDate(from);
  const b = parseUtcDate(to);
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(a)} – ${fmt(b)}`;
}

export function lastYearRange(now: Date): { from: Date; to: Date } {
  const to = startOfUtcDay(now);
  const from = addUtcDays(to, -364);
  return { from, to };
}

export function enumerateUtcDays(from: Date, to: Date): Date[] {
  const start = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  const days: Date[] = [];
  for (let d = start; d.getTime() <= end.getTime(); d = addUtcDays(d, 1)) {
    days.push(d);
  }
  return days;
}

export function readPackageVersion(): string {
  return "0.1.0";
}
