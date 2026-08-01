import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { reportSchema } from "./types";
import type { MyReport } from "./types";

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reportSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reports").insert({
      // The reporter always comes from the verified session, never from request data.
      reporter_id: context.userId,
      target_type: data.target_type,
      target_id: data.target_id,
      reason: data.reason,
      note: data.note ? data.note : null,
    });

    if (error) {
      if (error.code === "23505" || error.code === "23P01" || error.code === "23000") {
        throw new Error("You already have an open report on this.");
      }
      if (error.message.includes("unique") || error.message.includes("duplicate")) {
        throw new Error("You already have an open report on this.");
      }
      throw new Error(error.message);
    }

    return { filed: true as const };
  });

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reports")
      .select("id, target_type, target_id, reason, note, status, created_at")
      .eq("reporter_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return (data ?? []) as MyReport[];
  });

export const getMyOpenReportTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ targetIds: z.array(z.string().uuid()).max(100) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.targetIds.length === 0) return { targetIds: [] as string[] };
    const { data: rows, error } = await context.supabase
      .from("reports")
      .select("target_id")
      .eq("reporter_id", context.userId)
      .eq("status", "open")
      .in("target_id", data.targetIds);
    if (error) throw new Error(error.message);
    return { targetIds: (rows ?? []).map((row) => row.target_id) };
  });
