import { queryOptions } from "@tanstack/react-query";

import type { RadiusMiles } from "@/features/discovery/types";

import { listAdminStandingEvents } from "./admin.functions";
import { getStandingEvents } from "./standing-events.functions";

export const adminStandingEventsQuery = (neighborhoodId: string | null) =>
  queryOptions({
    queryKey: ["admin-standing-events", neighborhoodId],
    queryFn: () => listAdminStandingEvents({ data: { neighborhoodId } }),
  });

export const standingEventsQuery = ({
  slug,
  includeNearby = false,
  radiusMiles,
}: {
  slug: string;
  includeNearby?: boolean;
  radiusMiles?: RadiusMiles;
}) =>
  queryOptions({
    queryKey: ["standing-events", slug, includeNearby, radiusMiles ?? null],
    queryFn: () =>
      getStandingEvents({ data: { slug, includeNearby, ...(radiusMiles ? { radiusMiles } : {}) } }),
    staleTime: 5 * 60 * 1000,
  });
