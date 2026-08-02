import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { SectionHeading } from "@/components/community/section-heading";
import { PostCard } from "@/components/neighborhood/post-card";
import {
  DEFAULT_RADIUS_MILES,
  type ScopedPost,
} from "@/features/discovery/types";
import { myBlockedIdsQuery } from "@/features/moderation/queries";
import { scopedPostsQuery } from "@/features/neighborhoods/queries";
import type { Neighborhood, PostType } from "@/features/neighborhoods/types";
import { useSession } from "@/hooks/use-session";

/** Today needs at least this many visible local posts to feel like a board. */
export const LOCAL_DENSITY_TARGET = 6;
const NEARBY_TODAY_MAX = 4;
const NEARBY_TODAY_PER_COMMUNITY = 2;
/** Help stays local: proximity and trust, not reach. */
const NEARBY_TODAY_TYPES: PostType[] = ["plan", "marketplace"];

/** Private muting — a blocked neighbor's posts disappear for the blocker only. */
export function useBlockedIds() {
  const { session } = useSession();
  const blocked = useQuery({ ...myBlockedIdsQuery(), enabled: Boolean(session) });
  return blocked.data?.blockedIds ?? [];
}

export function withoutBlocked(posts: ScopedPost[], blockedIds: string[]) {
  if (blockedIds.length === 0) return posts;
  return posts.filter((post) => !post.author_id || !blockedIds.includes(post.author_id));
}

/** All visible local posts for a community, newest first. */
export function useVisibleLocalPosts(slug: string) {
  const { data } = useSuspenseQuery(scopedPostsQuery({ slug, types: null, scope: "local" }));
  const blockedIds = useBlockedIds();
  return withoutBlocked(data.local, blockedIds);
}

export function PostGrid({
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

/**
 * The optional discovery layer on Today: a clearly separated handful of nearby
 * plans and items, never disguised as local, and never displacing local posts.
 */
export function NearbyToday({
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
    <section className="border-t border-border pt-6">
      <SectionHeading>Nearby today</SectionHeading>
      <PostGrid posts={picked} showOrigin />
    </section>
  );
}
