import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { BlockedNeighbor } from "./types";

export const blockNeighbor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ neighborId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    if (data.neighborId === context.userId) {
      throw new Error("You can't block yourself.");
    }
    const { error } = await context.supabase
      .from("blocks")
      .upsert(
        { blocker_id: context.userId, blocked_id: data.neighborId },
        { onConflict: "blocker_id,blocked_id" },
      );
    if (error) throw new Error(error.message);
    return { blocked: true as const };
  });

export const unblockNeighbor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ neighborId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", context.userId)
      .eq("blocked_id", data.neighborId);
    if (error) throw new Error(error.message);
    return { blocked: false as const };
  });

/**
 * Ids the viewer has blocked in either direction. Used to mute public board
 * content for this viewer and to hide conversations with blocked neighbors.
 */
export const listMyBlockedIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", context.userId);
    if (error) throw new Error(error.message);
    return { blockedIds: (data ?? []).map((row) => row.blocked_id) };
  });

export const listMyBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("blocks")
      .select("id, blocked_id, created_at")
      .eq("blocker_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    if (rows.length === 0) return [] as BlockedNeighbor[];

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, display_name")
      .in(
        "id",
        rows.map((row) => row.blocked_id),
      );
    const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    return rows.map((row) => ({
      id: row.id,
      blocked_id: row.blocked_id,
      created_at: row.created_at,
      display_name: names.get(row.blocked_id) ?? "Neighbor",
    })) satisfies BlockedNeighbor[];
  });
