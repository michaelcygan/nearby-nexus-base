import { createServerFn } from "@tanstack/react-start";

import { fetchCommunityTodayContext } from "./data.server";

/**
 * Public read: everything the Today homepage needs beyond neighbor posts.
 * Rendered server-side so no visitor ever talks to a public-data API directly.
 */
export const getCommunityTodayContext = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug).slice(0, 120) }))
  .handler(async ({ data }) => fetchCommunityTodayContext(data.slug));
