import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PostListSkeleton } from "@/components/common/post-list-skeleton";
import { PostToCommunity } from "@/components/community/post-to-community";
import { ScopeControl } from "@/components/community/scope-control";
import { PostCard } from "@/components/neighborhood/post-card";
import {
  DEFAULT_RADIUS_MILES,
  type DiscoveryScope,
  type RadiusMiles,
  type ScopedPost,
} from "@/features/discovery/types";
import { myBlockedIdsQuery } from "@/features/moderation/queries";
import { neighborhoodPlacesQuery, scopedPostsQuery } from "@/features/neighborhoods/queries";
import {
  boardViewPostType,
  type BoardView,
  type Neighborhood,
  type Place,
  type PostType,
} from "@/features/neighborhoods/types";
import { useSession } from "@/hooks/use-session";

/** Today needs at least this many visible local posts to feel like a board. */
const LOCAL_DENSITY_TARGET = 6;
const NEARBY_TODAY_MAX = 4;
const NEARBY_TODAY_PER_COMMUNITY = 2;
/** Help stays local: proximity and trust, not reach. */
const NEARBY_TODAY_TYPES: PostType[] = ["plan", "marketplace"];

function typesForView(view: BoardView): PostType[] | null {
  const type = boardViewPostType[view];
  return type ? [type] : null;
}

/** Private muting — a blocked neighbor's posts disappear for the blocker only. */
function useBlockedIds() {
  const { session } = useSession();
  const blocked = useQuery({ ...myBlockedIdsQuery(), enabled: Boolean(session) });
  return blocked.data?.blockedIds ?? [];
}

function withoutBlocked(posts: ScopedPost[], blockedIds: string[]) {
  if (blockedIds.length === 0) return posts;
  return posts.filter((post) => !post.author_id || !blockedIds.includes(post.author_id));
}

/**
 * The single board renderer. Every filter — Today, Plans, Marketplace, Help,
 * Places — routes through here; there is no per-filter page implementation.
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
        <TodayBoard community={community} />
      ) : (
        <ScopedPostList
          community={community}
          view={view}
          scope={scope}
          radiusMiles={radiusMiles}
        />
      )}
    </Suspense>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
      {children}
    </h2>
  );
}

function PostGrid({
  posts,
  timeZone,
  showOrigin,
}: {
  posts: ScopedPost[];
  timeZone?: string | undefined;
  showOrigin?: boolean | undefined;
}) {
  return (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} timeZone={timeZone} showOrigin={showOrigin} />
      ))}
    </ul>
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
                  action={
                    <PostToCommunity slug={community.slug} name={community.name} size="sm" />
                  }
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
    </div>
  );
}

/**
 * Today is the clearest expression of the current neighborhood: no scope
 * control. When the local board is thin, a clearly separated handful of nearby
 * plans and items help it feel connected — never disguised as local.
 */
function TodayBoard({ community }: { community: Neighborhood }) {
  const { data } = useSuspenseQuery(
    scopedPostsQuery({ slug: community.slug, types: null, scope: "local" }),
  );
  const blockedIds = useBlockedIds();
  const local = withoutBlocked(data.local, blockedIds);
  const needsFill = local.length < LOCAL_DENSITY_TARGET;

  return (
    <div>
      {local.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={`The ${community.name} board is ready. Be the first neighbor to post.`}
            action={<PostToCommunity slug={community.slug} name={community.name} size="sm" />}
          />
        </div>
      ) : (
        <div className="mt-6">
          <PostGrid posts={local} timeZone={community.timezone} />
        </div>
      )}

      {needsFill ? (
        <NearbyToday community={community} localVisibleCount={local.length} />
      ) : null}
    </div>
  );
}

function NearbyToday({
  community,
  localVisibleCount,
}: {
  community: Neighborhood;
  localVisibleCount: number;
}) {
  const blockedIds = useBlockedIds();
  // Optional layer: a failure here must never take the local board down.
  const { data } = useQuery({
    ...scopedPostsQuery({
      slug: community.slug,
      types: NEARBY_TODAY_TYPES,
      scope: "nearby",
      radiusMiles: DEFAULT_RADIUS_MILES,
      limit: 24,
    }),
  });

  const candidates = withoutBlocked(data?.nearby ?? [], blockedIds);
  if (candidates.length === 0) return null;

  const room = Math.min(NEARBY_TODAY_MAX, Math.max(0, LOCAL_DENSITY_TARGET - localVisibleCount));
  if (room === 0) return null;

  // Newer first, distance as the tiebreak; at most two per neighboring community.
  const perCommunity = new Map<string, number>();
  const picked: ScopedPost[] = [];
  for (const post of [...candidates].sort((a, b) => {
    const byDate = b.created_at.localeCompare(a.created_at);
    if (byDate !== 0) return byDate;
    return (a.distance_miles ?? 0) - (b.distance_miles ?? 0);
  })) {
    const used = perCommunity.get(post.origin.slug) ?? 0;
    if (used >= NEARBY_TODAY_PER_COMMUNITY) continue;
    perCommunity.set(post.origin.slug, used + 1);
    picked.push(post);
    if (picked.length >= room) break;
  }

  if (picked.length === 0) return null;

  return (
    <section className="mt-10 border-t border-border pt-6">
      <SectionHeading>Nearby today</SectionHeading>
      <PostGrid posts={picked} showOrigin />
    </section>
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
