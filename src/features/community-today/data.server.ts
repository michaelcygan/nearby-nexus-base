import { fetchLibraryEvents, fetchParkActivities, fetchServicePulse } from "./chicago.server";
import type { CivicServicePulse, OfficialCommunityItem } from "./types";
import { fetchCommunityWeather } from "./weather.server";
import { isValidCoordinates } from "@/features/discovery/distance";
import { fetchNeighborhoodBySlug } from "@/features/neighborhoods/data.server";
import type { CommunityWeather } from "./types";

/**
 * The one server-side aggregate behind Today's non-post sections.
 *
 * Rules that hold no matter what upstream does:
 *  - every provider is optional; a failure yields an omitted section, never an
 *    error page and never a stale-looking placeholder;
 *  - no browser geolocation is involved — the community's own center is the
 *    only location input;
 *  - providers are chosen from the community's stored `civic_provider`, so a
 *    non-Chicago community simply has no civic sections.
 */

export type CommunityTodayContext = {
  weather: CommunityWeather | null;
  official: OfficialCommunityItem[];
  servicePulse: CivicServicePulse | null;
};

const EMPTY: CommunityTodayContext = { weather: null, official: [], servicePulse: null };

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

export async function fetchCommunityTodayContext(slug: string): Promise<CommunityTodayContext> {
  const community = await fetchNeighborhoodBySlug(slug);
  if (!community) return EMPTY;

  const center = { lat: community.center_lat, lng: community.center_lng };
  if (!isValidCoordinates(center)) return EMPTY;

  const chicago = community.civic_provider === "chicago_socrata";
  const areaCode = chicago ? (community.civic_area_codes[0] ?? null) : null;

  const [weather, library, parks, pulse] = await Promise.allSettled([
    fetchCommunityWeather(center),
    chicago ? fetchLibraryEvents(center) : Promise.resolve([]),
    chicago ? fetchParkActivities(center) : Promise.resolve([]),
    areaCode ? fetchServicePulse(areaCode) : Promise.resolve(null),
  ]);

  // Library events carry real start times, so they lead; park programs follow
  // with their published schedule text.
  const official = [
    ...settled<OfficialCommunityItem[]>(library, []),
    ...settled<OfficialCommunityItem[]>(parks, []),
  ].slice(0, 6);

  return {
    weather: settled<CommunityWeather | null>(weather, null),
    official,
    servicePulse: settled<CivicServicePulse | null>(pulse, null),
  };
}
