import type { CommunityRef, PostSummary } from "@/features/neighborhoods/types";

/**
 * Discovery lenses. A post always belongs to exactly one community — these are
 * ways of *browsing*, never new ownership states.
 */
export type DiscoveryScope = "local" | "nearby" | "city";
export type RadiusMiles = 3 | 5 | 10;

export const discoveryScopes = ["local", "nearby", "city"] as const;
export const radiusOptions = [3, 5, 10] as const satisfies ReadonlyArray<RadiusMiles>;
export const DEFAULT_RADIUS_MILES: RadiusMiles = 5;

/** Board views that may be browsed beyond the current community. */
export const scopedBoardViews = ["plans", "marketplace"] as const;

export function isDiscoveryScope(value: unknown): value is DiscoveryScope {
  return typeof value === "string" && (discoveryScopes as readonly string[]).includes(value);
}

export function isRadiusMiles(value: unknown): value is RadiusMiles {
  return typeof value === "number" && (radiusOptions as readonly number[]).includes(value);
}

/** The community a post actually belongs to — drives its canonical URL. */
export type PostOrigin = CommunityRef;

export type ScopedPost = PostSummary & {
  origin: PostOrigin;
  distance_miles: number | null;
};

export type ScopedPostsResult = {
  local: ScopedPost[];
  nearby: ScopedPost[];
  /** False when the broader lens could not be resolved (e.g. no coordinates). */
  nearbyAvailable: boolean;
};
