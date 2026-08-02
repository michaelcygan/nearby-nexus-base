/**
 * Curated, externally hosted recurring events at real neighborhood venues.
 *
 * These are not resident posts and never behave like them: no RSVP, no
 * attendees, no ownership. Neighborhood Today only points at the venue's own
 * page, which is why every card carries "Check with venue".
 */

export type StandingEventCategory =
  | "trivia"
  | "karaoke"
  | "bingo"
  | "games"
  | "drag"
  | "live_music"
  | "show_tunes"
  | "nightlife";

export type StandingEventStatus = "draft" | "active" | "paused";

/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type StandingEvent = {
  id: string;
  source_key: string;
  neighborhood_id: string | null;
  place_id: string | null;
  venue_name: string;
  venue_address: string | null;
  title: string;
  description: string | null;
  category: StandingEventCategory;
  days_of_week: number[];
  /** "19:30:00" — a local wall-clock time, never an instant. */
  start_time: string;
  end_time: string | null;
  /** 1 when the event ends after midnight, on the next calendar day. */
  end_day_offset: number;
  timezone: string;
  source_url: string;
  image_url: string | null;
  image_attribution: string | null;
  exception_note: string | null;
  starts_on: string | null;
  ends_on: string | null;
  excluded_dates: string[];
  status: StandingEventStatus;
  last_verified_at: string | null;
};

/** Where a series sits relative to the board being viewed. */
export type StandingEventOrigin = {
  slug: string;
  name: string;
  /** True when the series belongs to a *different* community than the board. */
  isNearby: boolean;
};

export type StandingEventSeries = StandingEvent & { origin: StandingEventOrigin };

export const standingEventCategoryLabels: Record<StandingEventCategory, string> = {
  trivia: "Trivia",
  karaoke: "Karaoke",
  bingo: "Bingo",
  games: "Games",
  drag: "Drag",
  live_music: "Live music",
  show_tunes: "Show tunes",
  nightlife: "Nightlife",
};

export const standingEventCategories = Object.keys(
  standingEventCategoryLabels,
) as StandingEventCategory[];

export const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const weekdayShortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Days a series must be re-verified within before an admin is warned. */
export const STALE_VERIFICATION_DAYS = 30;

export function isStaleVerification(lastVerifiedAt: string | null, now = new Date()): boolean {
  if (!lastVerifiedAt) return true;
  const verified = new Date(`${lastVerifiedAt}T12:00:00Z`).getTime();
  if (!Number.isFinite(verified)) return true;
  return now.getTime() - verified > STALE_VERIFICATION_DAYS * 86_400_000;
}
