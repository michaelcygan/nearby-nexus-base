import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PostListSkeleton } from "@/components/common/post-list-skeleton";
import { PostToCommunity } from "@/components/community/post-to-community";
import { PostCard } from "@/components/neighborhood/post-card";
import { myBlockedIdsQuery } from "@/features/moderation/queries";
import {
  neighborhoodPlacesQuery,
  neighborhoodPostsQuery,
} from "@/features/neighborhoods/queries";
import {
  boardViewPostType,
  type BoardView,
  type Place,
} from "@/features/neighborhoods/types";
import { useSession } from "@/hooks/use-session";

/**
 * The single board renderer. Every filter — Today, Plans, Marketplace, Help,
 * Places — routes through here; there is no per-filter page implementation.
 */
export function BoardContent({
  slug,
  name,
  timeZone,
  view,
}: {
  slug: string;
  name: string;
  timeZone: string;
  view: BoardView;
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
        <PlaceList slug={slug} />
      ) : (
        <PostList slug={slug} name={name} timeZone={timeZone} view={view} />
      )}
    </Suspense>
  );
}

function PostList({
  slug,
  name,
  timeZone,
  view,
}: {
  slug: string;
  name: string;
  timeZone: string;
  view: BoardView;
}) {
  const { data: allPosts } = useSuspenseQuery(
    neighborhoodPostsQuery(slug, boardViewPostType[view]),
  );
  const { session } = useSession();
  // Blocking is private: a blocked neighbor's posts are muted for the blocker
  // only, and nobody is told.
  const blocked = useQuery({ ...myBlockedIdsQuery(), enabled: Boolean(session) });
  const blockedIds = blocked.data?.blockedIds ?? [];
  const posts = blockedIds.length
    ? allPosts.filter((post) => !post.author_id || !blockedIds.includes(post.author_id))
    : allPosts;

  if (posts.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title={
            view === "today"
              ? `The ${name} board is ready. Be the first neighbor to post.`
              : `Nothing here yet on the ${name} board.`
          }
          action={<PostToCommunity slug={slug} name={name} size="sm" />}
        />
      </div>
    );
  }

  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} slug={slug} timeZone={timeZone} />
      ))}
    </ul>
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
          <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {category}
          </h2>
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
