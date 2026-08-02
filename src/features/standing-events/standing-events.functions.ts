import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { DEFAULT_RADIUS_MILES, isRadiusMiles, type RadiusMiles } from "@/features/discovery/types";

import { fetchStandingEventsForCommunity } from "./data.server";

/**
 * Public read: curated standing events for one community board. Deliberately
 * unauthenticated — a logged-out visitor must be able to discover a real
 * neighborhood event and open the venue's own page.
 */
export const getStandingEvents = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z.string().max(120),
        includeNearby: z.boolean().optional(),
        radiusMiles: z.number().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    fetchStandingEventsForCommunity({
      slug: data.slug,
      includeNearby: data.includeNearby ?? false,
      radiusMiles: (isRadiusMiles(data.radiusMiles)
        ? data.radiusMiles
        : DEFAULT_RADIUS_MILES) as RadiusMiles,
    }),
  );
