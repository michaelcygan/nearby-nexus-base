import type { StandingEvent } from "./types";

/**
 * Server-only helpers for standing-event administration. Kept out of the
 * `.functions.ts` wrapper so the server-fn transform can split handlers
 * without losing sibling declarations.
 */

export const ADMIN_COLUMNS =
  "id, source_key, neighborhood_id, place_id, venue_name, venue_address, title, description, category, days_of_week, start_time, end_time, end_day_offset, timezone, source_url, image_url, image_attribution, exception_note, starts_on, ends_on, excluded_dates, status, last_verified_at";

type AdminContext = {
  supabase: {
    rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }>;
  };
  userId: string;
};

export async function requireAdmin(context: AdminContext) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Forbidden: standing events are admin-curated.");
}

/** Normalizes nullable array columns so the UI never guards for null. */
export function normalizeAdminRow(row: unknown): StandingEvent {
  const event = row as StandingEvent;
  return {
    ...event,
    days_of_week: (event.days_of_week ?? []).slice().sort((a, b) => a - b),
    excluded_dates: event.excluded_dates ?? [],
    end_day_offset: event.end_day_offset ?? 0,
  };
}

/** "19:30" from the form → "19:30:00" for Postgres `time`. */
export function toDatabaseTime(value: string | null): string | null {
  if (!value) return null;
  return value.length === 5 ? `${value}:00` : value;
}

/** "19:30:00" from Postgres → "19:30" for an `<input type="time">`. */
export function toFormTime(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 5);
}
