import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ActivityError,
  fetchEventsActivity,
  fetchGraphqlActivity,
  loadActivity,
  mockActivity,
} from "../src/activity.js";

const FROZEN = new Date("2026-10-29T15:04:00Z");

describe("mockActivity", () => {
  it("is deterministic for a username and UTC day", () => {
    const a = mockActivity("webywz", FROZEN);
    const b = mockActivity("webywz", new Date("2026-10-29T23:59:59Z"));
    assert.equal(a.totalContributions, b.totalContributions);
    assert.deepEqual(a.weeks, b.weeks);
    assert.equal(a.source, "mock");
    assert.equal(a.range.to, "2026-10-29");
    assert.equal(a.range.from, "2025-10-30");
  });

  it("varies across usernames", () => {
    const a = mockActivity("alice", FROZEN);
    const b = mockActivity("bob", FROZEN);
    assert.notEqual(a.totalContributions, b.totalContributions);
  });

  it("covers a full year of dated days", () => {
    const activity = mockActivity("demo-user", FROZEN);
    const days = activity.weeks.flatMap((week) => week.days);
    assert.equal(days.length, 365);
    assert.equal(days[0].date, activity.range.from);
    assert.equal(days[days.length - 1].date, activity.range.to);
    assert.ok(activity.weeks.length >= 52 && activity.weeks.length <= 54);
    assert.ok(days.every((day) => day.count >= 0 && day.weekday >= 0 && day.weekday <= 6));
  });
});

describe("loadActivity fallbacks", () => {
  it("uses mock when requested, without touching the network", async () => {
    const activity = await loadActivity({
      user: "@Webywz",
      source: "mock",
      now: FROZEN,
      fetchImpl: async () => {
        throw new Error("network should not be called");
      },
    });
    assert.equal(activity.login, "Webywz");
    assert.equal(activity.source, "mock");
  });

  it("prefers GraphQL when a token is present", async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      assert.equal(String(input), "https://api.github.com/graphql");
      assert.equal(init?.method, "POST");
      return new Response(
        JSON.stringify({
          data: {
            user: {
              login: "webywz",
              name: "Shoshana Dicki",
              contributionsCollection: {
                contributionCalendar: {
                  totalContributions: 74,
                  weeks: [
                    {
                      contributionDays: [
                        { date: "2025-10-30", contributionCount: 2, weekday: 4 },
                        { date: "2025-10-31", contributionCount: 0, weekday: 5 },
                      ],
                    },
                  ],
                },
              },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const activity = await loadActivity({
      user: "webywz",
      token: "test-token",
      source: "auto",
      now: FROZEN,
      fetchImpl,
    });
    assert.equal(activity.source, "graphql");
    assert.equal(activity.totalContributions, 74);
    assert.equal(activity.name, "Shoshana Dicki");
    assert.equal(activity.weeks[0].days[0].count, 2);
  });

  it("falls through to public events when GraphQL fails", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async (input) => {
      calls += 1;
      const url = String(input);
      if (url.includes("graphql")) {
        return new Response("nope", { status: 500 });
      }
      return new Response(
        JSON.stringify([
          {
            type: "PushEvent",
            created_at: "2026-10-28T12:00:00Z",
            payload: { size: 3 },
          },
          {
            type: "WatchEvent",
            created_at: "2026-10-27T12:00:00Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const activity = await loadActivity({
      user: "webywz",
      token: "bad-token",
      source: "auto",
      now: FROZEN,
      fetchImpl,
    });
    assert.ok(calls >= 2);
    assert.equal(activity.source, "events");
    assert.equal(activity.totalContributions, 3);
  });

  it("uses mock when events also fail in auto mode", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("down", { status: 503 });
    const activity = await loadActivity({
      user: "offline-demo",
      source: "auto",
      now: FROZEN,
      fetchImpl,
    });
    assert.equal(activity.source, "mock");
    assert.equal(activity.login, "offline-demo");
  });
});

describe("fetchGraphqlActivity", () => {
  it("throws when the user is missing", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ data: { user: null } }), { status: 200 });
    await assert.rejects(
      () => fetchGraphqlActivity("missing-user", "token", FROZEN, fetchImpl),
      (error: unknown) => {
        assert.ok(error instanceof ActivityError);
        assert.equal(error.code, "not_found");
        return true;
      },
    );
  });
});

describe("fetchEventsActivity", () => {
  it("throws on a missing user", async () => {
    const fetchImpl: typeof fetch = async () => new Response("gone", { status: 404 });
    await assert.rejects(
      () => fetchEventsActivity("nope", undefined, FROZEN, fetchImpl),
      (error: unknown) => error instanceof ActivityError && error.code === "not_found",
    );
  });
});
