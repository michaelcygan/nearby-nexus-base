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
  "id, slug, name, city, state_code, location_type, timezone, status, tagline, about";
const COMMUNITY_REF_COLUMNS = "slug, name, city, state_code, timezone";
const POST_COLUMNS =
  "id, type, status, title, body, created_at, starts_at, location, capacity, price_cents, is_free, condition, needed_by, slots, image_paths, author_id, going_count, volunteer_count, interested_count";
const PLACE_COLUMNS = "id, name, category, address, description, website, phone";

type PublicClient = ReturnType<typeof createPublicSupabaseClient>;

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

export async function fetchNeighborhoodPosts(
  slug: string,
  type: PostType | null,
  limit: number,
): Promise<PostSummary[]> {
  const supabase = createPublicSupabaseClient();
  const neighborhood = await fetchNeighborhoodBySlug(slug);
  if (!neighborhood) return [];

  let query = supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("neighborhood_id", neighborhood.id)
    .eq("status", "active");

  if (type) query = query.eq("type", type);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return decoratePosts(supabase, data ?? []);
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

  const [posts, places] = await Promise.all([
    supabase
      .from("posts")
      .select("type")
      .eq("neighborhood_id", neighborhood.id)
      .eq("status", "active"),
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
