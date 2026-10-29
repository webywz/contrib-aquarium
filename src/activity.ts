import type { Activity, ContributionDay, LoadOptions, LoadSource } from "./types.js";
import {
  addUtcDays,
  enumerateUtcDays,
  hashString,
  lastYearRange,
  mulberry32,
  parseUtcDate,
  readPackageVersion,
  startOfUtcDay,
  utcIsoDate,
  weekdayUtc,
} from "./util.js";

const GRAPHQL_URL = "https://api.github.com/graphql";
const EVENTS_URL = "https://api.github.com/users";

function userAgent(): string {
  return `contrib-aquarium/${readPackageVersion()} (+https://github.com/webywz/contrib-aquarium)`;
}

export class ActivityError extends Error {
  constructor(
    message: string,
    readonly code: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ActivityError";
  }
}

function resolveToken(explicit?: string): string | undefined {
  return explicit || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined;
}

function daysToWeeks(days: ContributionDay[]): Activity["weeks"] {
  const weeks: Activity["weeks"] = [];
  let current: ContributionDay[] = [];
  for (const day of days) {
    if (day.weekday === 0 && current.length > 0) {
      weeks.push({ days: current });
      current = [];
    }
    current.push(day);
  }
  if (current.length > 0) weeks.push({ days: current });
  return weeks;
}

function emptyYear(login: string, now: Date, source: Activity["source"]): Activity {
  const { from, to } = lastYearRange(now);
  const days = enumerateUtcDays(from, to).map((date) => {
    const iso = utcIsoDate(date);
    return { date: iso, count: 0, weekday: weekdayUtc(iso) };
  });
  return {
    login,
    name: null,
    totalContributions: 0,
    weeks: daysToWeeks(days),
    source,
    range: { from: utcIsoDate(from), to: utcIsoDate(to) },
  };
}

/**
 * Deterministic contribution-like calendar derived from the username.
 * Same login + same `now` (UTC day) always yields the same year.
 */
export function mockActivity(login: string, now: Date = new Date()): Activity {
  const { from, to } = lastYearRange(now);
  const rng = mulberry32(hashString(login.trim().toLowerCase()));
  const diligence = 0.22 + rng() * 0.5;
  const strength = 1 + rng() * 7;
  const weekendFactor = 0.12 + rng() * 0.4;
  const burstiness = rng();
  const seasonalPhase = rng() * Math.PI * 2;

  const days: ContributionDay[] = enumerateUtcDays(from, to).map((date, index) => {
    const iso = utcIsoDate(date);
    const weekday = weekdayUtc(iso);
    const weekend = weekday === 0 || weekday === 6;
    const season = 0.75 + 0.45 * Math.sin((index / 365) * Math.PI * 2 + seasonalPhase);
    const p = diligence * season * (weekend ? weekendFactor : 1);
    let count = 0;
    if (rng() < p) {
      const burst = burstiness > 0.72 && rng() > 0.9 ? 10 + Math.floor(rng() * 12) : 0;
      count = Math.max(1, Math.round(strength * (0.35 + rng()) + burst));
      if (weekend) count = Math.max(1, Math.round(count * 0.45));
    }
    return { date: iso, count, weekday };
  });

  const totalContributions = days.reduce((sum, day) => sum + day.count, 0);
  return {
    login,
    name: null,
    totalContributions,
    weeks: daysToWeeks(days),
    source: "mock",
    range: { from: utcIsoDate(from), to: utcIsoDate(to) },
  };
}

type GraphqlCalendar = {
  data?: {
    user?: {
      login: string;
      name?: string | null;
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions: number;
          weeks: Array<{
            contributionDays: Array<{
              date: string;
              contributionCount: number;
              weekday?: number;
            }>;
          }>;
        };
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
};

const CALENDAR_QUERY = `query ($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    login
    name
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            weekday
          }
        }
      }
    }
  }
}`;

async function githubFetch(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const response = await fetchImpl(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  return response;
}

export async function fetchGraphqlActivity(
  login: string,
  token: string,
  now: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<Activity> {
  const { from, to } = lastYearRange(now);
  const response = await githubFetch(
    GRAPHQL_URL,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": userAgent(),
      },
      body: JSON.stringify({
        query: CALENDAR_QUERY,
        variables: {
          login,
          from: `${utcIsoDate(from)}T00:00:00Z`,
          to: `${utcIsoDate(to)}T23:59:59Z`,
        },
      }),
    },
    fetchImpl,
  );

  if (response.status === 401 || response.status === 403) {
    throw new ActivityError(
      `GitHub GraphQL rejected the token (${response.status})`,
      "auth",
    );
  }
  if (!response.ok) {
    throw new ActivityError(
      `GitHub GraphQL HTTP ${response.status}`,
      "http",
    );
  }

  const body = (await response.json()) as GraphqlCalendar;
  if (body.errors?.length) {
    throw new ActivityError(body.errors[0].message, "graphql");
  }
  if (!body.data?.user) {
    throw new ActivityError(`GitHub user "${login}" was not found`, "not_found");
  }

  const calendar = body.data.user.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    throw new ActivityError("GitHub returned no contribution calendar", "empty");
  }

  const weeks = calendar.weeks.map((week) => ({
    days: week.contributionDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
      weekday: weekdayUtc(day.date),
    })),
  }));

  return {
    login: body.data.user.login,
    name: body.data.user.name ?? null,
    totalContributions: calendar.totalContributions,
    weeks,
    source: "graphql",
    range: { from: utcIsoDate(from), to: utcIsoDate(to) },
  };
}

type GhEvent = {
  type?: string;
  created_at?: string;
  payload?: { size?: number; commits?: unknown[] };
};

function eventWeight(event: GhEvent): number {
  switch (event.type) {
    case "PushEvent":
      return Math.max(
        1,
        event.payload?.size ?? event.payload?.commits?.length ?? 1,
      );
    case "PullRequestEvent":
      return 2;
    case "PullRequestReviewEvent":
    case "IssuesEvent":
    case "IssueCommentEvent":
    case "CreateEvent":
    case "ReleaseEvent":
    case "CommitCommentEvent":
      return 1;
    case "WatchEvent":
    case "ForkEvent":
    case "PublicEvent":
      return 0;
    default:
      return event.type ? 1 : 0;
  }
}

export async function fetchEventsActivity(
  login: string,
  token?: string,
  now: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<Activity> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": userAgent(),
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const events: GhEvent[] = [];
  for (let page = 1; page <= 3; page++) {
    const url = `${EVENTS_URL}/${encodeURIComponent(login)}/events/public?per_page=100&page=${page}`;
    const response = await githubFetch(url, { headers }, fetchImpl);
    if (response.status === 404) {
      throw new ActivityError(`GitHub user "${login}" was not found`, "not_found");
    }
    if (response.status === 403) {
      throw new ActivityError("GitHub public events rate-limited", "rate_limit");
    }
    if (!response.ok) {
      throw new ActivityError(`GitHub events HTTP ${response.status}`, "http");
    }
    const batch = (await response.json()) as GhEvent[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    events.push(...batch);
    if (batch.length < 100) break;
  }

  const { from, to } = lastYearRange(now);
  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.created_at) continue;
    const iso = utcIsoDate(new Date(event.created_at));
    if (iso < utcIsoDate(from) || iso > utcIsoDate(to)) continue;
    const weight = eventWeight(event);
    if (weight <= 0) continue;
    counts.set(iso, (counts.get(iso) ?? 0) + weight);
  }

  const days: ContributionDay[] = enumerateUtcDays(from, to).map((date) => {
    const iso = utcIsoDate(date);
    return { date: iso, count: counts.get(iso) ?? 0, weekday: weekdayUtc(iso) };
  });

  return {
    login,
    name: null,
    totalContributions: days.reduce((sum, day) => sum + day.count, 0),
    weeks: daysToWeeks(days),
    source: "events",
    range: { from: utcIsoDate(from), to: utcIsoDate(to) },
  };
}

export async function loadActivity(options: LoadOptions): Promise<Activity> {
  const login = options.user.trim().replace(/^@/, "");
  if (!login) {
    throw new ActivityError("A GitHub username is required", "usage");
  }
  const now = startOfUtcDay(options.now ?? new Date());
  const token = resolveToken(options.token);
  const fetchImpl = options.fetchImpl ?? fetch;
  const source: LoadSource = options.source ?? "auto";

  const tryGraphql = () => {
    if (!token) {
      throw new ActivityError(
        "GraphQL source requires --token or GITHUB_TOKEN",
        "auth",
      );
    }
    return fetchGraphqlActivity(login, token, now, fetchImpl);
  };

  if (source === "mock") return mockActivity(login, now);
  if (source === "graphql") return tryGraphql();
  if (source === "events") {
    return fetchEventsActivity(login, token, now, fetchImpl);
  }

  if (token) {
    try {
      return await tryGraphql();
    } catch (error) {
      if (error instanceof ActivityError && error.code === "not_found") {
        throw error;
      }
      console.warn(
        `contrib-aquarium: GraphQL unavailable (${error instanceof Error ? error.message : error}); trying public events`,
      );
    }
  }

  try {
    return await fetchEventsActivity(login, token, now, fetchImpl);
  } catch (error) {
    if (error instanceof ActivityError && error.code === "not_found") {
      throw error;
    }
    console.warn(
      `contrib-aquarium: public events unavailable (${error instanceof Error ? error.message : error}); using deterministic mock`,
    );
    return mockActivity(login, now);
  }
}

export function overlayCounts(
  base: Activity,
  counts: Map<string, number>,
  source: Activity["source"],
): Activity {
  const weeks = base.weeks.map((week) => ({
    days: week.days.map((day) => ({
      ...day,
      count: counts.get(day.date) ?? day.count,
    })),
  }));
  const totalContributions = weeks
    .flatMap((week) => week.days)
    .reduce((sum, day) => sum + day.count, 0);
  return { ...base, weeks, totalContributions, source };
}

export function activityFromCounts(
  login: string,
  counts: Map<string, number>,
  now: Date,
  source: Activity["source"],
): Activity {
  const empty = emptyYear(login, now, source);
  return overlayCounts(empty, counts, source);
}

export { parseUtcDate, addUtcDays };
