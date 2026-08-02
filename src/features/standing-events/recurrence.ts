import { TZDate } from "@date-fns/tz";

import { weekdayNames, weekdayShortNames, type StandingEventSeries, type Weekday } from "./types";

/**
 * The single recurrence primitive.
 *
 * A standing event is stored once, as a weekly series with local wall-clock
 * times. Occurrences are derived here, at read time, and never written to the
 * database. All instant math goes through `TZDate` so daylight-saving
 * transitions are handled by the date library rather than by hand-rolled
 * offset arithmetic: 7:30 PM in Chicago stays 7:30 PM in Chicago on both
 * sides of a clock change.
 */

export type StandingEventOccurrence = {
  event: StandingEventSeries;
  /** Unique per series + date, so it is safe as a React key. */
  key: string;
  startsAt: Date;
  endsAt: Date | null;
  /** "Today", "Tomorrow", or "Thu, Aug 6". */
  dayLabel: string;
  /** "7:30 PM". */
  timeLabel: string;
  /** "Today · 7:30 PM" — the one line a card shows. */
  whenLabel: string;
  /** "Every Tuesday · 7:30 PM". */
  cadenceLabel: string;
  isNearby: boolean;
};

type CivilDate = { year: number; month: number; day: number };

const civilFormatters = new Map<string, Intl.DateTimeFormat>();

function civilFormatter(timeZone: string) {
  let formatter = civilFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    civilFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The calendar date an instant falls on, in a given time zone. */
export function civilDateIn(instant: Date, timeZone: string): CivilDate {
  const [year, month, day] = civilFormatter(timeZone).format(instant).split("-").map(Number);
  return { year: year!, month: month!, day: day! };
}

function addCivilDays(date: CivilDate, days: number): CivilDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function weekdayOf(date: CivilDate): Weekday {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay() as Weekday;
}

function toIsoDate(date: CivilDate): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

function civilDaysBetween(a: CivilDate, b: CivilDate): number {
  const left = Date.UTC(a.year, a.month - 1, a.day);
  const right = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((right - left) / 86_400_000);
}

/** "19:30:00" → { hours: 19, minutes: 30 }. */
function parseWallClock(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return { hours: hours ?? 0, minutes: minutes ?? 0 };
}

function instantFor(date: CivilDate, wallClock: string, timeZone: string): Date {
  const { hours, minutes } = parseWallClock(wallClock);
  return new Date(
    new TZDate(date.year, date.month - 1, date.day, hours, minutes, 0, timeZone).getTime(),
  );
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

function timeFormatter(timeZone: string) {
  let formatter = timeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    });
    timeFormatters.set(timeZone, formatter);
  }
  return formatter;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(timeZone: string) {
  let formatter = dateFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    dateFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** "Every Tuesday · 7:30 PM", or "Fri & Sat · 10:00 PM" for multi-day series. */
export function cadenceLabelFor(event: StandingEventSeries): string {
  const days = sortedDays(event.days_of_week);
  const time = timeFormatter(event.timezone).format(
    instantFor({ year: 2026, month: 1, day: 4 }, event.start_time, event.timezone),
  );

  if (days.length === 1) return `Every ${weekdayNames[days[0]!]} · ${time}`;
  if (days.length === 7) return `Every day · ${time}`;
  return `${days.map((day) => weekdayShortNames[day]).join(" & ")} · ${time}`;
}

function sortedDays(days: number[]): Weekday[] {
  return days
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b) as Weekday[];
}

function dayLabelFor(occurrenceDate: CivilDate, today: CivilDate, startsAt: Date, tz: string) {
  const offset = civilDaysBetween(today, occurrenceDate);
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  return dateFormatter(tz).format(startsAt);
}

/**
 * Every occurrence of the given series that overlaps [rangeStart, rangeEnd].
 *
 * An event still running past midnight counts as happening during the range,
 * which is what keeps a 9 PM–1 AM karaoke night on "today" at 11:50 PM.
 * `viewerTimeZone` only decides which calendar day counts as "Today".
 */
export function getStandingEventOccurrences(
  events: StandingEventSeries[],
  rangeStart: Date,
  rangeEnd: Date,
  viewerTimeZone: string,
  now: Date = rangeStart,
): StandingEventOccurrence[] {
  const occurrences: StandingEventOccurrence[] = [];
  const today = civilDateIn(now, viewerTimeZone);

  for (const event of events) {
    const days = sortedDays(event.days_of_week);
    if (days.length === 0) continue;

    const tz = event.timezone || viewerTimeZone;
    const firstCandidate = addCivilDays(civilDateIn(rangeStart, tz), -1);
    const lastCandidate = addCivilDays(civilDateIn(rangeEnd, tz), 1);
    const span = civilDaysBetween(firstCandidate, lastCandidate);
    const cadenceLabel = cadenceLabelFor(event);

    for (let offset = 0; offset <= span; offset += 1) {
      const date = addCivilDays(firstCandidate, offset);
      if (!days.includes(weekdayOf(date))) continue;

      const iso = toIsoDate(date);
      if (event.starts_on && iso < event.starts_on) continue;
      if (event.ends_on && iso > event.ends_on) continue;
      if (event.excluded_dates.includes(iso)) continue;

      const startsAt = instantFor(date, event.start_time, tz);
      const endsAt = event.end_time
        ? instantFor(addCivilDays(date, event.end_day_offset || 0), event.end_time, tz)
        : null;

      // Overlap, not containment: a late-night event belongs to the day it began.
      const effectiveEnd = endsAt ?? startsAt;
      if (startsAt.getTime() > rangeEnd.getTime()) continue;
      if (effectiveEnd.getTime() < rangeStart.getTime()) continue;

      occurrences.push({
        event,
        key: `${event.id}:${iso}`,
        startsAt,
        endsAt,
        dayLabel: dayLabelFor(date, today, startsAt, tz),
        timeLabel: timeFormatter(tz).format(startsAt),
        whenLabel: `${dayLabelFor(date, today, startsAt, tz)} · ${timeFormatter(tz).format(startsAt)}`,
        cadenceLabel,
        isNearby: event.origin.isNearby,
      });
    }
  }

  // Exact-community series always rank ahead of nearby ones, then by time.
  occurrences.sort((a, b) => {
    if (a.isNearby !== b.isNearby) return a.isNearby ? 1 : -1;
    return a.startsAt.getTime() - b.startsAt.getTime();
  });
  return occurrences;
}

/** Start-of-day and end-of-day instants for the viewer's current local date. */
export function todayRange(now: Date, timeZone: string): { start: Date; end: Date } {
  const date = civilDateIn(now, timeZone);
  return {
    start: instantFor(date, "00:00", timeZone),
    end: instantFor(addCivilDays(date, 1), "00:00", timeZone),
  };
}

/** The next `days` calendar days, starting with the viewer's local today. */
export function upcomingRange(now: Date, timeZone: string, days = 7) {
  const date = civilDateIn(now, timeZone);
  return {
    start: instantFor(date, "00:00", timeZone),
    end: instantFor(addCivilDays(date, days), "00:00", timeZone),
  };
}
