import { attachImageUrls, signPostImages } from "@/features/posts/data.server";
import { createPublicSupabaseClient } from "@/lib/supabase-public.server";

import type { StoreListing, StoreListingDetail } from "./types";

const LISTING_COLUMNS =
  "id, neighborhood_id, title, description, price_cents, currency, condition, pickup_notes, image_paths, status, created_at";

/** Public store board for a neighborhood: published, non-hidden listings only. */
export async function fetchStoreListings(slug: string): Promise<StoreListing[]> {
  const supabase = createPublicSupabaseClient();
  const { data: neighborhood } = await supabase
    .from("neighborhoods")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!neighborhood) return [];

  const { data, error } = await supabase
    .from("store_listings")
    .select(LISTING_COLUMNS)
    .eq("neighborhood_id", neighborhood.id)
    .in("status", ["available", "reserved", "sold"])
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const urls = await signPostImages(
    supabase as never,
    rows.flatMap((row) => row.image_paths ?? []),
  );
  return attachImageUrls(rows, urls) as unknown as StoreListing[];
}

export async function fetchStoreListing(listingId: string): Promise<StoreListingDetail | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("store_listings")
    .select(`${LISTING_COLUMNS}, neighborhoods!inner(slug, name, city)`)
    .eq("id", listingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { neighborhoods, ...listing } = data as unknown as StoreListing & {
    neighborhoods: { slug: string; name: string; city: string };
  };
  const urls = await signPostImages(supabase as never, listing.image_paths ?? []);
  const [withImages] = attachImageUrls([listing], urls);
  return { ...(withImages as StoreListing), neighborhood: neighborhoods };
}
