import { queryOptions } from "@tanstack/react-query";

import { DEFAULT_RADIUS_MILES, type DiscoveryScope, type RadiusMiles } from "@/features/discovery/types";
import {
  getNeighborhood,
  getNeighborhoodCounts,
  getNeighborhoodPlaces,
  getPlace,
  getPost,
  getScopedPosts,
  listNeighborhoods,
} from "./queries.functions";
import type { PostType } from "./types";

export const neighborhoodsQuery = () =>
  queryOptions({
    queryKey: ["neighborhoods"],
    queryFn: () => listNeighborhoods(),
  });

export const neighborhoodQuery = (slug: string) =>
  queryOptions({
    queryKey: ["neighborhood", slug],
    queryFn: () => getNeighborhood({ data: { slug } }),
  });

export const neighborhoodCountsQuery = (slug: string) =>
  queryOptions({
    queryKey: ["neighborhood", slug, "counts"],
    queryFn: () => getNeighborhoodCounts({ data: { slug } }),
  });

/**
 * Every input that changes the result is part of the cache key — local,
 * 3-mile, 5-mile, 10-mile, and citywide results never share an entry.
 */
export const scopedPostsQuery = ({
  slug,
  types,
  scope = "local",
  radiusMiles = DEFAULT_RADIUS_MILES,
  limit = 50,
}: {
  slug: string;
  types: PostType[] | null;
  scope?: DiscoveryScope;
  radiusMiles?: RadiusMiles;
  limit?: number;
}) =>
  queryOptions({
    queryKey: [
      "neighborhood",
      slug,
      "posts",
      types ? types.join("+") : "all",
      scope,
      scope === "nearby" ? radiusMiles : null,
      limit,
    ],
    queryFn: () =>
      getScopedPosts({ data: { slug, types, scope, radius: radiusMiles, limit } }),
  });

export const neighborhoodPlacesQuery = (slug: string) =>
  queryOptions({
    queryKey: ["neighborhood", slug, "places"],
    queryFn: () => getNeighborhoodPlaces({ data: { slug } }),
  });

export const postQuery = (slug: string, postId: string) =>
  queryOptions({
    queryKey: ["post", slug, postId],
    queryFn: () => getPost({ data: { slug, postId } }),
  });

export const placeQuery = (slug: string, placeId: string) =>
  queryOptions({
    queryKey: ["place", slug, placeId],
    queryFn: () => getPlace({ data: { slug, placeId } }),
  });
