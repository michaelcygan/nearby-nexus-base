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
import { boardViewPostType, isBoardView, type BoardView } from "@/features/neighborhoods/types";
import { canonicalUrl } from "@/lib/seo";

function boardPath(slug: string, view: BoardView) {
  return view === "today" ? `/${slug}` : `/${slug}?view=${view}`;
}

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
  loader: ({ params, deps, context }) => {
    if (deps.view === "places") {
      context.queryClient.ensureQueryData(neighborhoodPlacesQuery(params.slug));
      return;
    }
    const type = boardViewPostType[deps.view];
    context.queryClient.ensureQueryData(
      scopedPostsQuery({
        slug: params.slug,
        types: type ? [type] : null,
        scope: deps.scope,
        radiusMiles: deps.radiusMiles,
      }),
    );
    if (deps.view === "today") {
      // Ambient context streams in — Today must render without waiting on it.
      context.queryClient.prefetchQuery(communityTodayQuery(params.slug));
      context.queryClient.prefetchQuery(neighborhoodCountsQuery(params.slug));
      context.queryClient.prefetchQuery(neighborhoodPlacesQuery(params.slug));
    }
  },

  head: ({ params, match }) => {
    // Radius-filtered views are the same page: one canonical per board view.
    const href = canonicalUrl(boardPath(params.slug, match.search.view ?? "today"));
    return {
      links: [{ rel: "canonical", href }],
      meta: [{ property: "og:url", content: href }],
    };
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
