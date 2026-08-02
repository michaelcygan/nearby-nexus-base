import { createFileRoute } from "@tanstack/react-router";

/**
 * Permanent redirects for the retired `/n/<slug>/<module>` URLs. The six module
 * pages became one board page with a `view` filter, so every legacy path maps
 * onto `/<slug>` with the matching filter.
 */
const VIEW_FOR_MODULE: Record<string, string> = {
  plans: "plans",
  marketplace: "marketplace",
  volunteer: "help",
  directory: "places",
  store: "places",
};

function legacyDestination(splat: string) {
  const segments = splat.split("/").filter(Boolean);
  const [slug, ...rest] = segments;
  if (!slug) return "/";

  const [second, third] = rest;
  if (second === "p" && third) return `/${slug}/p/${third}`;
  if (second === "place" && third) return `/${slug}/place/${third}`;
  if (second && VIEW_FOR_MODULE[second]) return `/${slug}?view=${VIEW_FOR_MODULE[second]}`;
  return `/${slug}`;
}

export const Route = createFileRoute("/n/$")({
  server: {
    handlers: {
      GET: ({ params }) =>
        new Response(null, {
          status: 301,
          headers: { Location: legacyDestination(params["_splat"] ?? "") },
        }),
    },
  },
});
