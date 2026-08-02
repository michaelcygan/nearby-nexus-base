import { createPublicSupabaseClient } from "@/lib/supabase-public.server";

import type { Profile, ProfileRecord, SavedNeighborhood } from "./types";

const AVATAR_TTL_SECONDS = 60 * 60;

const PROFILE_COLUMNS =
  "id, display_name, about, avatar_path, home_neighborhood_id, neighborhoods:home_neighborhood_id(slug, name, city)";

/** `anon` is granted only these columns on profiles. */
const PUBLIC_PROFILE_COLUMNS = "id, display_name, avatar_path";

type ProfileRow = ProfileRecord & {
  neighborhoods: { slug: string; name: string; city: string } | null;
};

type SignedUrlClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null }>;
    };
  };
};

/** Avatars live in a private bucket, so every read needs a short-lived signed URL. */
export async function signAvatarUrl(
  client: SignedUrlClient,
  avatarPath: string | null,
): Promise<string | null> {
  if (!avatarPath) return null;
  const { data } = await client.storage
    .from("avatars")
    .createSignedUrl(avatarPath, AVATAR_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export async function shapeProfile(client: SignedUrlClient, row: ProfileRow): Promise<Profile> {
  return {
    id: row.id,
    display_name: row.display_name,
    about: row.about,
    avatar_path: row.avatar_path,
    home_neighborhood_id: row.home_neighborhood_id,
    avatar_url: await signAvatarUrl(client, row.avatar_path),
    home_neighborhood: row.neighborhoods,
  };
}

/**
 * Public neighbor read — runs as `anon`, which is granted only the
 * display name and avatar columns. Bio and home neighborhood are
 * sign-in-only and come from `getNeighborProfile`.
 */
export async function fetchPublicProfile(profileId: string): Promise<Profile | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    display_name: data.display_name,
    about: null,
    avatar_path: data.avatar_path,
    home_neighborhood_id: null,
    avatar_url: await signAvatarUrl(supabase, data.avatar_path),
    home_neighborhood: null,
  };
}

export { PROFILE_COLUMNS, PUBLIC_PROFILE_COLUMNS };
export type { ProfileRow, SavedNeighborhood };
