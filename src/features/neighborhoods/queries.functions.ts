import { createServerFn } from "@tanstack/react-start";

import {
  fetchNeighborhoodBySlug,
  fetchNeighborhoodCounts,
  fetchNeighborhoodPlaces,
  fetchNeighborhoodPosts,
  fetchNeighborhoods,
  fetchPlaceById,
  fetchPostById,
} from "./data.server";
import type { PostType } from "./types";

export const listNeighborhoods = createServerFn({ method: "GET" }).handler(async () =>
  fetchNeighborhoods(),
);

export const getNeighborhood = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug).slice(0, 120) }))
  .handler(async ({ data }) => fetchNeighborhoodBySlug(data.slug));

export const getNeighborhoodPosts = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; type?: PostType | null; limit?: number }) => ({
    slug: String(data.slug).slice(0, 120),
    type: data.type ?? null,
    limit: Math.min(Math.max(data.limit ?? 50, 1), 100),
  }))
  .handler(async ({ data }) => fetchNeighborhoodPosts(data.slug, data.type, data.limit));

export const getNeighborhoodPlaces = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug).slice(0, 120) }))
  .handler(async ({ data }) => fetchNeighborhoodPlaces(data.slug));

export const getNeighborhoodCounts = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug).slice(0, 120) }))
  .handler(async ({ data }) => fetchNeighborhoodCounts(data.slug));

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((data: { postId: string }) => ({ postId: String(data.postId).slice(0, 64) }))
  .handler(async ({ data }) => fetchPostById(data.postId));

export const getPlace = createServerFn({ method: "GET" })
  .inputValidator((data: { placeId: string }) => ({ placeId: String(data.placeId).slice(0, 64) }))
  .handler(async ({ data }) => fetchPlaceById(data.placeId));
