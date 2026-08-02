import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";

import { PostGrid, useBlockedIds, withoutBlocked } from "@/components/community/board-posts";
import { EmptyState } from "@/components/common/empty-state";
import { PostListSkeleton } from "@/components/common/post-list-skeleton";
import { PostToCommunity } from "@/components/community/post-to-community";
import { ScopeControl } from "@/components/community/scope-control";
import { SectionHeading } from "@/components/community/section-heading";
import { StandingEventsList } from "@/components/community/standing-events-list";
import { TodayHome } from "@/components/community/today-home";
import { type DiscoveryScope, type RadiusMiles } from "@/features/discovery/types";
import { neighborhoodPlacesQuery, scopedPostsQuery } from "@/features/neighborhoods/queries";
import {
  boardViewPostType,
  type BoardView,
  type Neighborhood,
  type Place,
  type PostType,
} from "@/features/neighborhoods/types";

function typesForView(view: BoardView): PostType[] | null {
  const type = boardViewPostType[view];
  return type ? [type] : null;
}

/**
 * The single board renderer. Every filter — Today, Plans, Marketplace, Help,
 * Places — routes through here; there is no per-filter page implementation.
 * Today is the community homepage rather than an unfiltered post list.
 */
export function BoardContent({
  community,
  view,
  scope,
  radiusMiles,
}: {
  community: Neighborhood;
  view: BoardView;
  scope: DiscoveryScope;
  radiusMiles: RadiusMiles;
}) {
  return (
    <Suspense
      fallback={
        <div className="mt-6">
          <PostListSkeleton />
        </div>
      }
    >
      {view === "places" ? (
        <PlaceList slug={community.slug} />
      ) : view === "today" ? (
        <TodayHome community={community} />
      ) : (
        <ScopedPostList community={community} view={view} scope={scope} radiusMiles={radiusMiles} />
      )}
    </Suspense>
  );
}

/** Plans and Marketplace: local first, then the optional discovery layer. */
function ScopedPostList({
  community,
  view,
  scope,
  radiusMiles,
}: {
  community: Neighborhood;
  view: BoardView;
  scope: DiscoveryScope;
  radiusMiles: RadiusMiles;
}) {
  const { data } = useSuspenseQuery(
    scopedPostsQuery({ slug: community.slug, types: typesForView(view), scope, radiusMiles }),
  );
  const blockedIds = useBlockedIds();
  const local = withoutBlocked(data.local, blockedIds);
  const nearby = withoutBlocked(data.nearby, blockedIds);
  const broader = scope !== "local";

  return (
    <div>
      <ScopeControl
        slug={community.slug}
        view={view}
        communityName={community.name}
        city={community.city}
        showCity={community.location_type === "neighborhood"}
        scope={scope}
        radiusMiles={radiusMiles}
      />

      {local.length === 0 && nearby.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={
              broader
                ? `Nothing posted within reach of ${community.name} yet.`
                : `Nothing here yet on the ${community.name} board.`
            }
            {...(broader && !data.nearbyAvailable
              ? {
                  description:
                    "We don't have enough information about neighboring communities yet, so this is showing the local board.",
                }
              : {})}
            action={<PostToCommunity slug={community.slug} name={community.name} size="sm" />}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <SectionHeading>{`In ${community.name}`}</SectionHeading>
            {local.length > 0 ? (
              <PostGrid posts={local} timeZone={community.timezone} />
            ) : (
              <div className="mt-3">
                <EmptyState
                  title={`Nothing here yet on the ${community.name} board.`}
                  action={<PostToCommunity slug={community.slug} name={community.name} size="sm" />}
                />
              </div>
            )}
          </section>

          {broader && nearby.length > 0 ? (
            <section>
              <SectionHeading>Nearby</SectionHeading>
              <PostGrid posts={nearby} showOrigin />
            </section>
          ) : null}
        </div>
      )}

      {/* Venue-run recurring nights: below neighbor plans, and always separated. */}
      {view === "plans" ? (
        <div className="mt-8">
          <StandingEventsList community={community} />
        </div>
      ) : null}
    </div>
  );
}

function PlaceList({ slug }: { slug: string }) {
  const { data: places } = useSuspenseQuery(neighborhoodPlacesQuery(slug));

  if (places.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="No places listed yet"
          description="Curated places for this community will appear here."
        />
      </div>
    );
  }

  const grouped = places.reduce<Record<string, Place[]>>((acc, place) => {
    (acc[place.category] ??= []).push(place);
    return acc;
  }, {});

  return (
    <div className="mt-6 space-y-8">
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category}>
          <SectionHeading>{category}</SectionHeading>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {items.map((place) => (
              <li
                key={place.id}
                className="rounded-md border border-border bg-card transition-colors hover:border-primary/50"
              >
                <Link
                  to="/$slug/place/$placeId"
                  params={{ slug, placeId: place.id }}
                  className="block rounded-md p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <h3 className="font-display text-lg font-semibold leading-snug">{place.name}</h3>
                  {place.address ? (
                    <p className="mt-1 text-sm text-muted-foreground">{place.address}</p>
                  ) : null}
                  {place.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {place.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Check the official website for current hours
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
