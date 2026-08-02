import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { BoardContent } from "@/components/community/board-content";
import { BoardFilters } from "@/components/community/board-filters";
import {
  neighborhoodPlacesQuery,
  neighborhoodPostsQuery,
  neighborhoodQuery,
} from "@/features/neighborhoods/queries";
import { boardViewPostType, isBoardView, type BoardView } from "@/features/neighborhoods/types";
import { canonicalUrl } from "@/lib/seo";

function boardPath(slug: string, view: BoardView) {
  return view === "today" ? `/${slug}` : `/${slug}?view=${view}`;
}

export const Route = createFileRoute("/$slug/")({
  // `view` stays optional so a bare /edgewater renders 200 with no redirect hop.
  validateSearch: (search: Record<string, unknown>): { view?: BoardView } =>
    isBoardView(search["view"]) ? { view: search["view"] } : {},
  loaderDeps: ({ search }) => ({ view: search.view ?? ("today" as BoardView) }),
  loader: ({ params, deps, context }) => {
    if (deps.view === "places") {
      context.queryClient.ensureQueryData(neighborhoodPlacesQuery(params.slug));
    } else {
      context.queryClient.ensureQueryData(
        neighborhoodPostsQuery(params.slug, boardViewPostType[deps.view]),
      );
    }
  },
  head: ({ params, match }) => {
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
      {view === "today" && community.about ? (
        <p className="mt-6 max-w-prose text-base text-muted-foreground">{community.about}</p>
      ) : null}
      <BoardContent
        slug={slug}
        name={community.name}
        timeZone={community.timezone}
        view={view}
      />
    </div>
  );
}
