import { createPublicSupabaseClient } from "@/lib/supabase-public.server";

const IMAGE_TTL_SECONDS = 60 * 60;
export const POST_IMAGE_BUCKET = "post-images";

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrls: (
        paths: string[],
        expiresIn: number,
      ) => Promise<{ data: Array<{ path: string | null; signedUrl: string }> | null }>;
    };
  };
};

/**
 * Batch-signs post image paths so a feed of posts costs one storage call
 * instead of one per image.
 */
export async function signPostImages(
  client: StorageClient,
  paths: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};

  const { data } = await client.storage.from(POST_IMAGE_BUCKET).createSignedUrls(unique, IMAGE_TTL_SECONDS);
  const map: Record<string, string> = {};
  for (const entry of data ?? []) {
    if (entry.path) map[entry.path] = entry.signedUrl;
  }
  return map;
}

export async function signPostImagesPublic(paths: string[]) {
  return signPostImages(createPublicSupabaseClient() as unknown as StorageClient, paths);
}

export function attachImageUrls<T extends { image_paths?: string[] | null }>(
  rows: T[],
  urls: Record<string, string>,
): Array<T & { image_urls: string[] }> {
  return rows.map((row) => ({
    ...row,
    image_urls: (row.image_paths ?? []).map((path) => urls[path]).filter(Boolean) as string[],
  }));
}
