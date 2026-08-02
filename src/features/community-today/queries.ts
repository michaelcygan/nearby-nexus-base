import { queryOptions } from "@tanstack/react-query";

import { getCommunityTodayContext } from "./today.functions";

/**
 * Cached for five minutes on the client: weather and civic sections are
 * ambient context, not live data, and the server caches upstream calls too.
 */
export const communityTodayQuery = (slug: string) =>
  queryOptions({
    queryKey: ["community-today", slug],
    queryFn: () => getCommunityTodayContext({ data: { slug } }),
    staleTime: 5 * 60 * 1000,
  });
