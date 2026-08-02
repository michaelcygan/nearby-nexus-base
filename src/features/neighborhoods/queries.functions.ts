import { createServerFn } from "@tanstack/react-start";

import {
  DEFAULT_RADIUS_MILES,
  isDiscoveryScope,
  isRadiusMiles,
  type DiscoveryScope,
  type RadiusMiles,
} from "@/features/discovery/types";
import {
  fetchNeighborhoodBySlug,
  fetchNeighborhoodCounts,
  fetchNeighborhoodPlaces,
  fetchNeighborhoods,
  fetchPlaceById,
  fetchPostById,
  fetchScopedPosts,
} from "./data.server";
import type { PostType } from "./types";

const POST_TYPES: PostType[] = ["plan", "marketplace", "volunteer"];

/**
 * Never pass unchecked client values into geographic or database logic:
 * anything unsupported resolves to plain local behavior.
 */
function sanitizeScope(scope: unknown, radius: unknown): { scope: DiscoveryScope; radiusMiles: RadiusMiles } {
  if (!isDiscoveryScope(scope) || scope === "local") {
    return { scope: "local", radiusMiles: DEFAULT_RADIUS_MILES };
  }
  if (scope === "city") return { scope: "city", radiusMiles: DEFAULT_RADIUS_MILES };
  return {
    scope: "nearby",
    radiusMiles: isRadiusMiles(radius) ? radius : DEFAULT_RADIUS_MILES,
  };
}

function sanitizeTypes(types: unknown): PostType[] | null {
  if (!Array.isArray(types)) return null;
  const allowed = types.filter((type): type is PostType =>
    POST_TYPES.includes(type as PostType),
  );
  return allowed.length > 0 ? [...new Set(allowed)] : null;
}

export const listNeighborhoods = createServerFn({ method: "GET" }).handler(async () =>
  fetchNeighborhoods(),
);

export const getNeighborhood = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug).slice(0, 120) }))
  .handler(async ({ data }) => fetchNeighborhoodBySlug(data.slug));

export const getScopedPosts = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      slug: string;
      types?: PostType[] | null;
      scope?: DiscoveryScope | null;
      radius?: number | null;
      limit?: number;
    }) => {
      const { scope, radiusMiles } = sanitizeScope(data.scope, data.radius);
      return {
        slug: String(data.slug).slice(0, 120),
        types: sanitizeTypes(data.types),
        scope,
        radiusMiles,
        limit: Math.min(Math.max(data.limit ?? 50, 1), 100),
      };
    },
  )
  .handler(async ({ data }) => fetchScopedPosts(data));

export const getNeighborhoodPlaces = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug).slice(0, 120) }))
  .handler(async ({ data }) => fetchNeighborhoodPlaces(data.slug));

export const getNeighborhoodCounts = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug).slice(0, 120) }))
  .handler(async ({ data }) => fetchNeighborhoodCounts(data.slug));

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((data: { postId: string; slug: string }) => ({
    postId: String(data.postId).slice(0, 64),
    slug: String(data.slug).slice(0, 120),
  }))
  .handler(async ({ data }) => fetchPostById(data.postId, data.slug));

export const getPlace = createServerFn({ method: "GET" })
  .inputValidator((data: { placeId: string; slug: string }) => ({
    placeId: String(data.placeId).slice(0, 64),
    slug: String(data.slug).slice(0, 120),
  }))
  .handler(async ({ data }) => fetchPlaceById(data.placeId, data.slug));
