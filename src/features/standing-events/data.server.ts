import { resolveCommunityScope } from "@/features/discovery/scope.server";
import { DEFAULT_RADIUS_MILES, type RadiusMiles } from "@/features/discovery/types";
import { fetchNeighborhoodBySlug } from "@/features/neighborhoods/data.server";
import { createPublicSupabaseClient } from "@/lib/supabase-public.server";

import type { StandingEvent, StandingEventSeries } from "./types";

/**
 * Public reads for curated standing events.
 *
 * RLS already limits anonymous callers to active series in published
 * communities; the queries here stay explicit anyway so a policy change can
 * never quietly widen what a visitor sees. Nothing is written, ever — these
 * rows are read-only from the app's perspective.
 */

const PUBLIC_COLUMNS =
  "id, source_key, neighborhood_id, place_id, venue_name, venue_address, title, description, category, days_of_week, start_time, end_time, end_day_offset, timezone, source_url, image_url, image_attribution, exception_note, starts_on, ends_on, excluded_dates, status, last_verified_at, image_verified_at";

function normalizeRow(row: unknown): StandingEvent {
  const event = row as StandingEvent;
  return {
    ...event,
    days_of_week: event.days_of_week ?? [],
    excluded_dates: event.excluded_dates ?? [],
    end_day_offset: event.end_day_offset ?? 0,
  };
}

/**
 * Every active series a community board may show: its own first, then those
 * of communities inside the existing discovery radius. Proximity comes from
 * the one geospatial layer the app already has (community centers), never
 * from a second per-venue system.
 */
export async function fetchStandingEventsForCommunity({
  slug,
  includeNearby = false,
  radiusMiles = DEFAULT_RADIUS_MILES,
}: {
  slug: string;
  includeNearby?: boolean;
  radiusMiles?: RadiusMiles;
}): Promise<StandingEventSeries[]> {
  const community = await fetchNeighborhoodBySlug(slug);
  if (!community) return [];

  const scope = includeNearby
    ? await resolveCommunityScope({ originCommunity: community, scope: "nearby", radiusMiles })
    : null;

  const byId = new Map<string, { slug: string; name: string; isNearby: boolean }>([
    [community.id, { slug: community.slug, name: community.name, isNearby: false }],
  ]);
  for (const other of scope?.others ?? []) {
    byId.set(other.id, { slug: other.slug, name: other.name, isNearby: true });
  }

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("standing_events")
      .select(PUBLIC_COLUMNS)
      .eq("status", "active")
      .in("neighborhood_id", [...byId.keys()]);
    if (error) throw new Error(error.message);

    return (data ?? []).flatMap<StandingEventSeries>((row) => {
      const event = normalizeRow(row);
      const origin = event.neighborhood_id ? byId.get(event.neighborhood_id) : undefined;
      if (!origin) return [];
      return [{ ...event, origin }];
    });
  } catch {
    // A curated-events outage must never take a community board down.
    return [];
  }
}
