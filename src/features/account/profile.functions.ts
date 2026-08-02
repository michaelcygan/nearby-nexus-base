import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { fetchPublicProfile, PROFILE_COLUMNS, shapeProfile } from "./data.server";
import type { ProfileRow } from "./data.server";
import { profileSchema } from "./types";

export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((data: { profileId: string }) =>
    z.object({ profileId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => fetchPublicProfile(data.profileId));

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    // The signup trigger creates the row, but self-heal if it is somehow absent.
    if (!data) {
      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: userId })
        .select(PROFILE_COLUMNS)
        .single();
      if (insertError) throw insertError;
      return shapeProfile(supabase, created as ProfileRow);
    }

    return shapeProfile(supabase, data as ProfileRow);
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => profileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        about: data.about ? data.about : null,
        home_neighborhood_id: data.home_neighborhood_id ?? null,
      })
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw error;
    return shapeProfile(supabase, updated as ProfileRow);
  });

export const setMyAvatarPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ avatar_path: z.string().min(1).max(400).nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // The path must live inside the caller's own folder; storage policies enforce
    // the same rule on upload, this keeps the column honest too.
    if (data.avatar_path && !data.avatar_path.startsWith(`${userId}/`)) {
      throw new Error("That avatar path does not belong to you.");
    }
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ avatar_path: data.avatar_path })
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw error;
    return shapeProfile(supabase, updated as ProfileRow);
  });

export const listMySavedNeighborhoods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_neighborhoods")
      .select("id, neighborhoods:neighborhood_id(id, slug, name, city)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? [])
      .filter((row) => row.neighborhoods !== null)
      .map((row) => ({ id: row.id, neighborhood: row.neighborhoods! }));
  });

export const saveNeighborhood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ neighborhoodId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_neighborhoods")
      .upsert(
        { user_id: context.userId, neighborhood_id: data.neighborhoodId },
        { onConflict: "user_id,neighborhood_id" },
      );
    if (error) throw error;
    return { saved: true };
  });

export const unsaveNeighborhood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ neighborhoodId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_neighborhoods")
      .delete()
      .eq("user_id", context.userId)
      .eq("neighborhood_id", data.neighborhoodId);
    if (error) throw error;
    return { saved: false };
  });

/**
 * Signed-in read of another neighbor: bio and home neighborhood are only
 * granted to authenticated roles, so visitors get the public shape instead.
 */
export const getNeighborProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { profileId: string }) =>
    z.object({ profileId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", data.profileId)
      .maybeSingle();

    if (error) throw error;
    if (!row) return null;
    return shapeProfile(supabase, row as ProfileRow);
  });
