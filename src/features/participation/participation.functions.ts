import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { MyParticipation, PostParticipant } from "./types";

const roleSchema = z.enum(["going", "volunteer", "interested"]);

export const joinPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        postId: z.string().uuid(),
        role: roleSchema,
        note: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // The participant is always the verified session user, never request data.
    const { error } = await context.supabase.from("post_participants").insert({
      post_id: data.postId,
      user_id: context.userId,
      role: data.role,
      note: data.note?.length ? data.note : null,
    });

    if (error) {
      if (error.code === "23505" || error.message.includes("duplicate key")) {
        throw new Error("You already signed up for this one.");
      }
      throw new Error(error.message);
    }
    return { joined: true as const, role: data.role };
  });

export const leavePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ postId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("post_participants")
      .delete()
      .eq("post_id", data.postId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { joined: false as const };
  });

export const getMyParticipation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ postId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("post_participants")
      .select("id, post_id, role, note, created_at")
      .eq("post_id", data.postId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const listMyParticipation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("post_participants")
      .select(
        "id, post_id, role, note, created_at, posts:post_id(id, title, type, starts_at, needed_by, neighborhoods:neighborhood_id(slug, name))",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const post = row.posts as unknown as
        | {
            id: string;
            title: string;
            type: string;
            starts_at: string | null;
            needed_by: string | null;
            neighborhoods: { slug: string; name: string } | null;
          }
        | null;
      return {
        id: row.id,
        post_id: row.post_id,
        role: row.role,
        note: row.note,
        created_at: row.created_at,
        post: post
          ? {
              id: post.id,
              title: post.title,
              type: post.type,
              starts_at: post.starts_at,
              needed_by: post.needed_by,
              neighborhood_slug: post.neighborhoods?.slug ?? "",
              neighborhood_name: post.neighborhoods?.name ?? "",
            }
          : null,
      };
    }) as unknown as MyParticipation[];
  });

/** Author-only guest list. RLS already limits rows to posts the caller wrote. */
export const listPostParticipants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ postId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, author_id")
      .eq("id", data.postId)
      .maybeSingle();
    if (postError) throw new Error(postError.message);
    if (!post || post.author_id !== userId) return [] as PostParticipant[];

    const { data: rows, error } = await supabase
      .from("post_participants")
      .select("id, user_id, role, note, created_at")
      .eq("post_id", data.postId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!rows?.length) return [] as PostParticipant[];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in(
        "id",
        rows.map((row) => row.user_id),
      );

    const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    return rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      role: row.role,
      note: row.note,
      created_at: row.created_at,
      display_name: names.get(row.user_id) ?? "Neighbor",
    })) as PostParticipant[];
  });
