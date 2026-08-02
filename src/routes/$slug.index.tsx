import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { BoardContent } from "@/components/community/board-content";
import { BoardFilters } from "@/components/community/board-filters";
import {
  DEFAULT_RADIUS_MILES,
  isDiscoveryScope,
  isRadiusMiles,
  scopedBoardViews,
  type DiscoveryScope,
  type RadiusMiles,
} from "@/features/discovery/types";
import {
  neighborhoodPlacesQuery,
  neighborhoodQuery,
  scopedPostsQuery,
} from "@/features/neighborhoods/queries";

import {
  boardViewLabels,
  boardViewPostType,
  isBoardView,
  type BoardView,
} from "@/features/neighborhoods/types";
import { canonicalUrl } from "@/lib/seo";

function boardPath(slug: string, view: BoardView) {
  return view === "today" ? `/${slug}` : `/${slug}?view=${view}`;
}

/** Each tab is a distinct indexable page, so each needs its own summary. */
const boardViewDescriptions: Record<Exclude<BoardView, "today">, (name: string) => string> = {
  plans: (name) => `Gatherings, walks, and get-togethers neighbors are planning in ${name}.`,
  marketplace: (name) => `Things neighbors in ${name} are selling, lending, and giving away.`,
  help: (name) => `Requests for a hand and offers to help out around ${name}.`,
  places: (name) => `A neighbor-kept directory of useful local places in ${name}.`,
};


type BoardSearch = { view?: BoardView; scope?: DiscoveryScope; radius?: RadiusMiles };

/**
 * Local is represented by *omitting* scope and radius, so a bare board URL
 * always means "this community only". Only Plans and Marketplace may look
 * wider; Today, Help, and Places normalize back to local.
 */
function normalizeSearch(search: Record<string, unknown>): BoardSearch {
  const view = isBoardView(search["view"]) ? search["view"] : undefined;
  const result: BoardSearch = view ? { view } : {};

  const scopeable = view && (scopedBoardViews as readonly string[]).includes(view);
  if (!scopeable) return result;

  const rawScope = search["scope"];
  if (!isDiscoveryScope(rawScope) || rawScope === "local") return result;
  if (rawScope === "city") return { ...result, scope: "city" };

  const rawRadius = Number(search["radius"]);
  return {
    ...result,
    scope: "nearby",
    radius: isRadiusMiles(rawRadius) ? rawRadius : DEFAULT_RADIUS_MILES,
  };
}

export const Route = createFileRoute("/$slug/")({
  // `view` stays optional so a bare /edgewater renders 200 with no redirect hop.
  validateSearch: normalizeSearch,
  loaderDeps: ({ search }) => ({
    view: search.view ?? ("today" as BoardView),
    scope: search.scope ?? ("local" as DiscoveryScope),
    radiusMiles: search.radius ?? DEFAULT_RADIUS_MILES,
  }),
  loader: async ({ params, deps, context }) => {
    if (deps.view === "places") {
      context.queryClient.ensureQueryData(neighborhoodPlacesQuery(params.slug));
    } else {
      const type = boardViewPostType[deps.view];
      context.queryClient.ensureQueryData(
        scopedPostsQuery({
          slug: params.slug,
          types: type ? [type] : null,
          scope: deps.scope,
          radiusMiles: deps.radiusMiles,
        }),
      );
    }
    // Today's ambient sections (weather, city data, directory preview) are
    // fetched after hydration and hold reserved space, so nothing here waits
    // on a public-data API — and the server HTML matches the first client pass.
    const community = await context.queryClient.ensureQueryData(neighborhoodQuery(params.slug));
    return { name: community?.name ?? null };
  },

  head: ({ params, match, loaderData }) => {
    const view: BoardView = match.search.view ?? "today";
    // Radius-filtered views are the same page: one canonical per board view.
    const href = canonicalUrl(boardPath(params.slug, view));
    const name = loaderData?.name;
    const meta: Array<Record<string, string>> = [{ property: "og:url", content: href }];

    // Each tab is its own indexable URL, so it gets its own title and summary.
    if (name && view !== "today") {
      const label = boardViewLabels[view];
      const title = `${label} in ${name} — Neighborhood Today`;
      const description = boardViewDescriptions[view](name);
      meta.push(
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      );
    }

    return { links: [{ rel: "canonical", href }], meta };
  },

  component: CommunityBoard,
  errorComponent: () => <ErrorState title="The board didn't load" />,
  notFoundComponent: () => <EmptyState title="Nothing here yet" />,
});

function CommunityBoard() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const view: BoardView = search.view ?? "today";
  const { data: community } = useSuspenseQuery(neighborhoodQuery(slug));

  if (!community) return null;

  return (
    <div>
      <BoardFilters slug={slug} active={view} />
      <BoardContent
        community={community}
        view={view}
        scope={search.scope ?? "local"}
        radiusMiles={search.radius ?? DEFAULT_RADIUS_MILES}
      />
    </div>
  );
}
