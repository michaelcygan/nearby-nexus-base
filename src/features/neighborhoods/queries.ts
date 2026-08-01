import { queryOptions } from "@tanstack/react-query";

import {
  getNeighborhood,
  getNeighborhoodCounts,
  getNeighborhoodPlaces,
  getNeighborhoodPosts,
  getPlace,
  getPost,
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

export const neighborhoodPostsQuery = (slug: string, type: PostType | null, limit = 50) =>
  queryOptions({
    queryKey: ["neighborhood", slug, "posts", type ?? "all", limit],
    queryFn: () => getNeighborhoodPosts({ data: { slug, type, limit } }),
  });

export const neighborhoodPlacesQuery = (slug: string) =>
  queryOptions({
    queryKey: ["neighborhood", slug, "places"],
    queryFn: () => getNeighborhoodPlaces({ data: { slug } }),
  });

export const postQuery = (postId: string) =>
  queryOptions({
    queryKey: ["post", postId],
    queryFn: () => getPost({ data: { postId } }),
  });

export const placeQuery = (placeId: string) =>
  queryOptions({
    queryKey: ["place", placeId],
    queryFn: () => getPlace({ data: { placeId } }),
  });
