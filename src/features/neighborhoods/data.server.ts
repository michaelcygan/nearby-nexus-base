import { attachImageUrls, signPostImages } from "@/features/posts/data.server";
import { createPublicSupabaseClient } from "@/lib/supabase-public.server";
import type {
  Neighborhood,
  Place,
  PlaceDetail,
  PostDetail,
  PostSummary,
  PostType,
} from "./types";

const NEIGHBORHOOD_COLUMNS = "id, slug, name, city, tagline, about";
const POST_COLUMNS =
  "id, type, status, title, body, created_at, starts_at, location, capacity, price_cents, is_free, condition, needed_by, slots, image_paths, author_id, going_count, volunteer_count, interested_count";
const PLACE_COLUMNS = "id, name, category, address, description, website, phone, hours";

export async function fetchNeighborhoods(): Promise<Neighborhood[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("neighborhoods")
    .select(NEIGHBORHOOD_COLUMNS)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchNeighborhoodBySlug(slug: string): Promise<Neighborhood | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("neighborhoods")
    .select(NEIGHBORHOOD_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
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
  const rows = data ?? [];
  const urls = await signPostImages(
    supabase as never,
    rows.flatMap((row) => row.image_paths ?? []),
  );
  return attachImageUrls(rows, urls) as unknown as PostSummary[];
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
  return data ?? [];
}

export async function fetchPostById(postId: string): Promise<PostDetail | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select(`${POST_COLUMNS}, neighborhoods!inner(slug, name, city)`)
    .eq("id", postId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { neighborhoods, ...post } = data as unknown as PostSummary & {
    neighborhoods: { slug: string; name: string; city: string };
  };
  const urls = await signPostImages(supabase as never, post.image_paths ?? []);
  const [withImages] = attachImageUrls([post], urls);
  return { ...(withImages as PostSummary), neighborhood: neighborhoods };
}

export async function fetchPlaceById(placeId: string): Promise<PlaceDetail | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("places")
    .select(`${PLACE_COLUMNS}, neighborhoods!inner(slug, name, city)`)
    .eq("id", placeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { neighborhoods, ...place } = data as unknown as Place & {
    neighborhoods: { slug: string; name: string; city: string };
  };
  return { ...place, neighborhood: neighborhoods };
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
