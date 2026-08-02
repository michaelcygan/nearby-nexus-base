import { haversineMiles, isValidCoordinates } from "@/features/discovery/distance";
import type { DiscoveryScope, RadiusMiles } from "@/features/discovery/types";
import type { Neighborhood } from "@/features/neighborhoods/types";
import { createPublicSupabaseClient } from "@/lib/supabase-public.server";

const SCOPE_COLUMNS =
  "id, slug, name, city, state_code, location_type, timezone, status, center_lat, center_lng";

export type ScopedCommunity = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state_code: string | null;
  timezone: string;
  /** 0 for the origin community itself. */
  distance_miles: number;
};

export type CommunityScope = {
  /** The community whose page is being viewed. */
  origin: ScopedCommunity;
  /** Other published communities inside the lens, nearest first. */
  others: ScopedCommunity[];
  /** False when the lens could not be resolved (missing coordinates, error). */
  available: boolean;
};

function normalize(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Resolves which published communities a discovery lens covers.
 *
 * Distance is measured community-center to community-center. `nearby` may
 * cross municipal lines; `city` never does. Any failure degrades to
 * local-only — the local board matters more than the optional lens.
 */
export async function resolveCommunityScope({
  originCommunity,
  scope,
  radiusMiles,
}: {
  originCommunity: Pick<
    Neighborhood,
    "id" | "slug" | "name" | "city" | "state_code" | "timezone" | "center_lat" | "center_lng"
  >;
  scope: DiscoveryScope;
  radiusMiles: RadiusMiles;
}): Promise<CommunityScope> {
  const origin: ScopedCommunity = {
    id: originCommunity.id,
    slug: originCommunity.slug,
    name: originCommunity.name,
    city: originCommunity.city,
    state_code: originCommunity.state_code,
    timezone: originCommunity.timezone,
    distance_miles: 0,
  };

  const localOnly: CommunityScope = { origin, others: [], available: false };
  if (scope === "local") return { ...localOnly, available: true };

  const originCenter = { lat: originCommunity.center_lat, lng: originCommunity.center_lng };
  if (scope === "nearby" && !isValidCoordinates(originCenter)) return localOnly;

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("neighborhoods")
      .select(SCOPE_COLUMNS)
      .eq("status", "published");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Array<
      Neighborhood & { center_lat: number | null; center_lng: number | null }
    >;

    const others: ScopedCommunity[] = [];
    for (const row of rows) {
      if (row.id === origin.id) continue;

      let distance = 0;
      if (scope === "nearby") {
        const center = { lat: row.center_lat, lng: row.center_lng };
        if (!isValidCoordinates(center) || !isValidCoordinates(originCenter)) continue;
        distance = haversineMiles(originCenter, center);
        if (distance > radiusMiles) continue;
      } else {
        // City scope: exact municipality match, never across city or state.
        if (normalize(row.city) !== normalize(origin.city)) continue;
        if (normalize(row.state_code) !== normalize(origin.state_code)) continue;
        const center = { lat: row.center_lat, lng: row.center_lng };
        distance =
          isValidCoordinates(center) && isValidCoordinates(originCenter)
            ? haversineMiles(originCenter, center)
            : 0;
      }

      others.push({
        id: row.id,
        slug: row.slug,
        name: row.name,
        city: row.city,
        state_code: row.state_code,
        timezone: row.timezone,
        distance_miles: distance,
      });
    }

    others.sort((a, b) => a.distance_miles - b.distance_miles);
    return { origin, others, available: true };
  } catch {
    return localOnly;
  }
}
