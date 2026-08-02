import { describe, expect, it } from "vitest";

import { cadenceLabelFor, getStandingEventOccurrences, todayRange, upcomingRange } from "./recurrence";
import type { StandingEventSeries } from "./types";

const base: StandingEventSeries = {
  id: "11111111-1111-1111-1111-111111111111",
  source_key: "test-series",
  neighborhood_id: "22222222-2222-2222-2222-222222222222",
  place_id: null,
  venue_name: "Test Tavern",
  venue_address: "1 N Clark St",
  title: "Tuesday Night Trivia",
  description: null,
  category: "trivia",
  days_of_week: [2],
  start_time: "19:30:00",
  end_time: null,
  end_day_offset: 0,
  timezone: "America/Chicago",
  source_url: "https://example.com/events",
  image_url: null,
  image_attribution: null,
  exception_note: null,
  starts_on: null,
  ends_on: null,
  excluded_dates: [],
  status: "active",
  last_verified_at: "2026-08-01",
  origin: { slug: "edgewater", name: "Edgewater", isNearby: false },
};

const CHICAGO = "America/Chicago";

function series(overrides: Partial<StandingEventSeries>): StandingEventSeries {
  return { ...base, ...overrides };
}

describe("getStandingEventOccurrences", () => {
  it("returns one occurrence per matching weekday in a seven-day window", () => {
    const now = new Date("2026-08-03T14:00:00Z"); // Monday in Chicago
    const { start, end } = upcomingRange(now, CHICAGO, 7);
    const found = getStandingEventOccurrences([base], start, end, CHICAGO, now);

    expect(found).toHaveLength(1);
    // 7:30 PM CDT === 00:30 UTC the next day.
    expect(found[0]!.startsAt.toISOString()).toBe("2026-08-05T00:30:00.000Z");
    expect(found[0]!.timeLabel).toBe("7:30 PM");
  });

  it("labels the current and next local day in words", () => {
    const now = new Date("2026-08-04T13:00:00Z"); // Tuesday morning in Chicago
    const { start, end } = upcomingRange(now, CHICAGO, 3);
    const tuesday = getStandingEventOccurrences([base], start, end, CHICAGO, now);
    expect(tuesday[0]!.dayLabel).toBe("Today");
    expect(tuesday[0]!.whenLabel).toBe("Today · 7:30 PM");

    const monday = new Date("2026-08-03T13:00:00Z");
    const range = upcomingRange(monday, CHICAGO, 3);
    const fromMonday = getStandingEventOccurrences([base], range.start, range.end, CHICAGO, monday);
    expect(fromMonday[0]!.dayLabel).toBe("Tomorrow");
  });

  it("supports several weekdays on one series", () => {
    const weekend = series({ days_of_week: [5, 6], start_time: "22:00:00" });
    const now = new Date("2026-08-03T13:00:00Z");
    const { start, end } = upcomingRange(now, CHICAGO, 7);
    const found = getStandingEventOccurrences([weekend], start, end, CHICAGO, now);

    expect(found).toHaveLength(2);
    expect(found.map((o) => o.startsAt.toISOString())).toEqual([
      "2026-08-08T03:00:00.000Z", // Friday 10 PM CDT
      "2026-08-09T03:00:00.000Z", // Saturday 10 PM CDT
    ]);
  });

  it("keeps a wall-clock time stable across the spring-forward transition", () => {
    // DST begins Sunday 2027-03-14; 7:30 PM Monday is CST before, CDT after.
    const beforeNow = new Date("2027-03-08T12:00:00Z");
    const before = getStandingEventOccurrences(
      [series({ days_of_week: [1] })],
      ...(({ start, end }) => [start, end] as const)(upcomingRange(beforeNow, CHICAGO, 2)),
      CHICAGO,
      beforeNow,
    );
    expect(before[0]!.startsAt.toISOString()).toBe("2027-03-09T01:30:00.000Z"); // CST, UTC-6
    expect(before[0]!.timeLabel).toBe("7:30 PM");

    const afterNow = new Date("2027-03-15T12:00:00Z");
    const after = getStandingEventOccurrences(
      [series({ days_of_week: [1] })],
      ...(({ start, end }) => [start, end] as const)(upcomingRange(afterNow, CHICAGO, 2)),
      CHICAGO,
      afterNow,
    );
    expect(after[0]!.startsAt.toISOString()).toBe("2027-03-16T00:30:00.000Z"); // CDT, UTC-5
    expect(after[0]!.timeLabel).toBe("7:30 PM");
  });

  it("keeps a wall-clock time stable across the fall-back transition", () => {
    // DST ends Sunday 2026-11-01.
    const now = new Date("2026-11-02T13:00:00Z");
    const { start, end } = upcomingRange(now, CHICAGO, 3);
    const found = getStandingEventOccurrences([base], start, end, CHICAGO, now);
    expect(found[0]!.startsAt.toISOString()).toBe("2026-11-04T01:30:00.000Z"); // CST
    expect(found[0]!.timeLabel).toBe("7:30 PM");
  });

  it("treats an after-midnight event as belonging to the day it started", () => {
    const lateNight = series({
      days_of_week: [4],
      start_time: "21:00:00",
      end_time: "01:00:00",
      end_day_offset: 1,
    });
    // 11:50 PM Chicago on Thursday 2026-08-06.
    const now = new Date("2026-08-07T04:50:00Z");
    const { start, end } = todayRange(now, CHICAGO);
    const found = getStandingEventOccurrences([lateNight], start, end, CHICAGO, now);

    expect(found).toHaveLength(1);
    expect(found[0]!.dayLabel).toBe("Today");
    expect(found[0]!.endsAt!.toISOString()).toBe("2026-08-07T06:00:00.000Z"); // 1 AM CDT Friday
  });

  it("honours starts_on, ends_on, and excluded_dates", () => {
    const now = new Date("2026-08-03T13:00:00Z");
    const { start, end } = upcomingRange(now, CHICAGO, 7);

    expect(
      getStandingEventOccurrences([series({ excluded_dates: ["2026-08-04"] })], start, end, CHICAGO, now),
    ).toHaveLength(0);
    expect(
      getStandingEventOccurrences([series({ starts_on: "2026-08-05" })], start, end, CHICAGO, now),
    ).toHaveLength(0);
    expect(
      getStandingEventOccurrences([series({ ends_on: "2026-08-03" })], start, end, CHICAGO, now),
    ).toHaveLength(0);
  });

  it("ranks exact-community occurrences ahead of nearby ones", () => {
    const now = new Date("2026-08-04T13:00:00Z");
    const { start, end } = todayRange(now, CHICAGO);
    const nearby = series({
      id: "33333333-3333-3333-3333-333333333333",
      start_time: "18:00:00",
      origin: { slug: "lakeview", name: "Lakeview", isNearby: true },
    });

    const found = getStandingEventOccurrences([nearby, base], start, end, CHICAGO, now);
    expect(found.map((o) => o.isNearby)).toEqual([false, true]);
  });

  it("never mutates or generates stored rows", () => {
    const input = series({});
    const snapshot = JSON.stringify(input);
    const now = new Date("2026-08-03T13:00:00Z");
    const { start, end } = upcomingRange(now, CHICAGO, 7);
    getStandingEventOccurrences([input], start, end, CHICAGO, now);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe("cadenceLabelFor", () => {
  it("names a single weekday", () => {
    expect(cadenceLabelFor(base)).toBe("Every Tuesday · 7:30 PM");
  });

  it("abbreviates multiple weekdays", () => {
    expect(cadenceLabelFor(series({ days_of_week: [5, 6], start_time: "22:00:00" }))).toBe(
      "Fri & Sat · 10:00 PM",
    );
  });
});
