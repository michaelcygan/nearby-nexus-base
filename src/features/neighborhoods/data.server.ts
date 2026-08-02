import { resolveCommunityScope, type ScopedCommunity } from "@/features/discovery/scope.server";
import type {
  DiscoveryScope,
  RadiusMiles,
  ScopedPost,
  ScopedPostsResult,
} from "@/features/discovery/types";
import { attachImageUrls, signPostImages } from "@/features/posts/data.server";
import { createPublicSupabaseClient } from "@/lib/supabase-public.server";
import type {
  CommunityRef,
  Neighborhood,
  Place,
  PlaceDetail,
  PostDetail,
  PostSummary,
  PostType,
} from "./types";

const NEIGHBORHOOD_COLUMNS =
  "id, slug, name, city, state_code, location_type, timezone, status, tagline, about, center_lat, center_lng";
const COMMUNITY_REF_COLUMNS = "slug, name, city, state_code, timezone";
const POST_COLUMNS =
  "id, type, status, title, body, created_at, expires_at, starts_at, location, capacity, price_cents, is_free, condition, needed_by, slots, image_paths, author_id, neighborhood_id, going_count, volunteer_count, interested_count";
const PLACE_COLUMNS = "id, name, category, address, description, website, phone";

type PublicClient = ReturnType<typeof createPublicSupabaseClient>;

/**
 * A post is publicly visible only while it is active *and* unexpired. RLS
 * already handles hidden/removed rows and unpublished communities; this adds
 * the expiry half so an `active` row whose `expires_at` has passed never
 * surfaces locally, nearby, or in counts.
 */
function visibleNow<T extends { eq: (c: string, v: unknown) => T; or: (f: string) => T }>(
  query: T,
): T {
  const now = new Date().toISOString();
  return query.eq("status", "active").or(`expires_at.is.null,expires_at.gt.${now}`);
}

/**
 * Public display names for post authors. Only `display_name` is ever selected —
 * email addresses are never exposed on the board.
 */
async function fetchAuthorNames(
  supabase: PublicClient,
  authorIds: Array<string | null>,
): Promise<Record<string, string>> {
  const unique = [...new Set(authorIds.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return {};
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", unique);
  const names: Record<string, string> = {};
  for (const row of data ?? []) names[row.id] = row.display_name;
  return names;
}

async function decoratePosts(supabase: PublicClient, rows: unknown[]): Promise<PostSummary[]> {
  const posts = rows as Array<{ image_paths: string[] | null; author_id: string | null }>;
  const [urls, names] = await Promise.all([
    signPostImages(
      supabase as never,
      posts.flatMap((row) => row.image_paths ?? []),
    ),
    fetchAuthorNames(
      supabase,
      posts.map((row) => row.author_id),
    ),
  ]);
  return attachImageUrls(posts, urls).map((row) => ({
    ...row,
    author_name: row.author_id ? (names[row.author_id] ?? null) : null,
  })) as unknown as PostSummary[];
}

export async function fetchNeighborhoods(): Promise<Neighborhood[]> {
  const supabase = createPublicSupabaseClient();
  // RLS restricts anonymous reads to published communities.
  const { data, error } = await supabase
    .from("neighborhoods")
    .select(NEIGHBORHOOD_COLUMNS)
    .eq("status", "published")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Neighborhood[];
}

export async function fetchNeighborhoodBySlug(slug: string): Promise<Neighborhood | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("neighborhoods")
    .select(NEIGHBORHOOD_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as unknown as Neighborhood | null;
}

function communityRef(community: ScopedCommunity): CommunityRef {
  return {
    slug: community.slug,
    name: community.name,
    city: community.city,
    state_code: community.state_code,
    timezone: community.timezone,
  };
}

async function fetchVisiblePostRows(
  supabase: PublicClient,
  neighborhoodIds: string[],
  types: PostType[] | null,
  limit: number,
) {
  let query = supabase.from("posts").select(POST_COLUMNS).in("neighborhood_id", neighborhoodIds);
  query = visibleNow(query as never) as never;
  if (types && types.length > 0) query = query.in("type", types);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Array<{ neighborhood_id: string }>;
}

/**
 * The single scoped board query. `local` always comes first and is never
 * displaced by broader content; `nearby` is the optional discovery layer.
 * Posts are never duplicated — each row carries the community it belongs to,
 * which is what its card links to.
 */
export async function fetchScopedPosts({
  slug,
  types,
  scope,
  radiusMiles,
  limit,
}: {
  slug: string;
  types: PostType[] | null;
  scope: DiscoveryScope;
  radiusMiles: RadiusMiles;
  limit: number;
}): Promise<ScopedPostsResult> {
  const empty: ScopedPostsResult = { local: [], nearby: [], nearbyAvailable: false };
  const supabase = createPublicSupabaseClient();
  const community = await fetchNeighborhoodBySlug(slug);
  if (!community) return empty;

  const resolved = await resolveCommunityScope({
    originCommunity: community,
    scope,
    radiusMiles,
  });

  const localRows = await fetchVisiblePostRows(supabase, [community.id], types, limit);
  const remaining = Math.max(0, limit - localRows.length);

  const byCommunity = new Map<string, ScopedCommunity>([[resolved.origin.id, resolved.origin]]);
  for (const other of resolved.others) byCommunity.set(other.id, other);

  let nearbyRows: Array<{ neighborhood_id: string }> = [];
  if (scope !== "local" && resolved.others.length > 0 && remaining > 0) {
    const rows = await fetchVisiblePostRows(
      supabase,
      resolved.others.map((other) => other.id),
      types,
      limit,
    );
    // Nearest community first; newer posts win at equivalent distance.
    nearbyRows = rows
      .slice()
      .sort((a, b) => {
        const da = byCommunity.get(a.neighborhood_id)?.distance_miles ?? Number.MAX_SAFE_INTEGER;
        const db = byCommunity.get(b.neighborhood_id)?.distance_miles ?? Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        const ca = (a as { created_at: string }).created_at;
        const cb = (b as { created_at: string }).created_at;
        return cb.localeCompare(ca);
      })
      .slice(0, remaining);
  }

  const decorated = await decoratePosts(supabase, [...localRows, ...nearbyRows]);
  const attach = (post: PostSummary): ScopedPost => {
    const origin = byCommunity.get((post as unknown as { neighborhood_id: string }).neighborhood_id);
    return {
      ...post,
      origin: origin ? communityRef(origin) : communityRef(resolved.origin),
      distance_miles:
        origin && origin.id !== resolved.origin.id ? origin.distance_miles : null,
    };
  };

  return {
    local: decorated.slice(0, localRows.length).map(attach),
    nearby: decorated.slice(localRows.length).map(attach),
    nearbyAvailable: resolved.available,
  };
}

export async function fetchNeighborhoodPlaces(slug: string): Promise<Place[]> {
  const supabase = createPublicSupabaseClient();
  const neighborhood = await fetchNeighborhoodBySlug(slug);
  if (!neighborhood) return [];

  const { data, error } = await supabase
    .from("places")
    .select(PLACE_COLUMNS)
    .eq("neighborhood_id", neighborhood.id)
    .order("category")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Place[];
}

/**
 * A post is only readable at the community slug it belongs to: a post from
 * another community must never render under Edgewater.
 */
export async function fetchPostById(postId: string, slug: string): Promise<PostDetail | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select(`${POST_COLUMNS}, neighborhoods!inner(${COMMUNITY_REF_COLUMNS}, status)`)
    .eq("id", postId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { neighborhoods, ...post } = data as unknown as {
    neighborhoods: CommunityRef & { status: string };
  };
  if (neighborhoods.slug !== slug || neighborhoods.status !== "published") return null;

  const { status: _status, ...neighborhood } = neighborhoods;
  const [decorated] = await decoratePosts(supabase, [post]);
  if (!decorated) return null;
  return { ...decorated, neighborhood };
}

export async function fetchPlaceById(placeId: string, slug: string): Promise<PlaceDetail | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("places")
    .select(`${PLACE_COLUMNS}, neighborhoods!inner(${COMMUNITY_REF_COLUMNS}, status)`)
    .eq("id", placeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { neighborhoods, ...place } = data as unknown as Place & {
    neighborhoods: CommunityRef & { status: string };
  };
  if (neighborhoods.slug !== slug || neighborhoods.status !== "published") return null;

  const { status: _status, ...neighborhood } = neighborhoods;
  return { ...(place as Place), neighborhood };
}

export async function fetchNeighborhoodCounts(
  slug: string,
): Promise<{ plan: number; marketplace: number; volunteer: number; places: number }> {
  const supabase = createPublicSupabaseClient();
  const neighborhood = await fetchNeighborhoodBySlug(slug);
  const empty = { plan: 0, marketplace: 0, volunteer: 0, places: 0 };
  if (!neighborhood) return empty;

  const postsQuery = visibleNow(
    supabase.from("posts").select("type").eq("neighborhood_id", neighborhood.id) as never,
  ) as unknown as PromiseLike<{ data: Array<{ type: string }> | null; error: { message: string } | null }>;

  const [posts, places] = await Promise.all([
    postsQuery,
    supabase
      .from("places")
      .select("id", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhood.id),
  ]);

  if (posts.error) throw new Error(posts.error.message);
  if (places.error) throw new Error(places.error.message);

  const counts = { ...empty, places: places.count ?? 0 };
  for (const row of posts.data ?? []) {
    counts[row.type as PostType] += 1;
  }
  return counts;
}
