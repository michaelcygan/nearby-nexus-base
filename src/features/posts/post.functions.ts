import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { attachImageUrls, POST_IMAGE_BUCKET, signPostImages } from "./data.server";
import { postInputSchema, toPostRow } from "./schemas";

const MY_POST_COLUMNS =
  "id, type, status, title, body, created_at, starts_at, location, capacity, price_cents, is_free, condition, needed_by, slots, image_paths, going_count, volunteer_count, interested_count, neighborhood_id, neighborhoods:neighborhood_id(slug, name, city)";

function assertOwnedPaths(paths: string[], userId: string) {
  for (const path of paths) {
    if (!path.startsWith(`${userId}/`)) {
      throw new Error("That image path does not belong to you.");
    }
  }
}

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => postInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    assertOwnedPaths(data.image_paths, userId);

    const { data: created, error } = await supabase
      .from("posts")
      // author_id always comes from the verified session, never from request data.
      .insert({ ...toPostRow(data), author_id: userId })
      .select("id, neighborhoods:neighborhood_id(slug)")
      .single();

    if (error) throw new Error(error.message);
    return {
      id: created.id,
      slug: (created.neighborhoods as { slug: string } | null)?.slug ?? null,
    };
  });

export const updateMyPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ postId: z.string().uuid(), values: z.unknown() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const values = postInputSchema.parse(data.values);
    assertOwnedPaths(values.image_paths, userId);

    const { data: updated, error } = await supabase
      .from("posts")
      .update(toPostRow(values))
      .eq("id", data.postId)
      .eq("author_id", userId)
      .select("id, neighborhoods:neighborhood_id(slug)")
      .single();

    if (error) throw new Error(error.message);
    return {
      id: updated.id,
      slug: (updated.neighborhoods as { slug: string } | null)?.slug ?? null,
    };
  });

export const setMyPostStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ postId: z.string().uuid(), status: z.enum(["active", "completed"]) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posts")
      .update({ status: data.status })
      .eq("id", data.postId)
      .eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { status: data.status };
  });

export const deleteMyPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ postId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("posts")
      .select("image_paths")
      .eq("id", data.postId)
      .eq("author_id", userId)
      .maybeSingle();

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", data.postId)
      .eq("author_id", userId);
    if (error) throw new Error(error.message);

    const paths = (existing?.image_paths ?? []).filter((path) => path.startsWith(`${userId}/`));
    if (paths.length > 0) {
      await supabase.storage.from(POST_IMAGE_BUCKET).remove(paths);
    }
    return { deleted: true };
  });

export const listMyPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("posts")
      .select(MY_POST_COLUMNS)
      .eq("author_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const urls = await signPostImages(
      supabase as never,
      rows.flatMap((row) => row.image_paths ?? []),
    );
    return attachImageUrls(rows, urls).map((row) => ({
      ...row,
      neighborhood: row.neighborhoods as { slug: string; name: string; city: string } | null,
    }));
  });

export const getMyPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ postId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("posts")
      .select(MY_POST_COLUMNS)
      .eq("id", data.postId)
      .eq("author_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return null;

    const urls = await signPostImages(supabase as never, row.image_paths ?? []);
    const [shaped] = attachImageUrls([row], urls);
    return shaped ?? null;
  });
