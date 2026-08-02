import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { ADMIN_COLUMNS, normalizeAdminRow, requireAdmin, toDatabaseTime } from "./admin.server";
import { standingEventInputSchema } from "./schemas";

/**
 * Admin CRUD for curated standing events. Every handler re-checks the admin
 * role through the caller's own RLS-scoped client, so being signed in is never
 * enough on its own.
 */

export const listAdminStandingEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ neighborhoodId: z.string().uuid().nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    let query = context.supabase.from("standing_events").select(ADMIN_COLUMNS);
    query = data.neighborhoodId
      ? query.eq("neighborhood_id", data.neighborhoodId)
      : query.is("neighborhood_id", null);
    const { data: rows, error } = await query.order("venue_name").order("title");
    if (error) throw new Error(error.message);
    return (rows ?? []).map(normalizeAdminRow);
  });

export const saveStandingEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ eventId: z.string().uuid().nullable(), values: standingEventInputSchema })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const payload = {
      ...data.values,
      start_time: toDatabaseTime(data.values.start_time)!,
      end_time: toDatabaseTime(data.values.end_time ?? null),
    };

    if (data.eventId) {
      const { error } = await context.supabase
        .from("standing_events")
        .update(payload)
        .eq("id", data.eventId);
      if (error) throw new Error(error.message);
      return { id: data.eventId };
    }

    const { data: created, error } = await context.supabase
      .from("standing_events")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const setStandingEventStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        status: z.enum(["draft", "active", "paused"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { error } = await context.supabase
      .from("standing_events")
      .update({ status: data.status })
      .eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Records that a human re-checked the venue's page today. */
export const verifyStandingEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase
      .from("standing_events")
      .update({ last_verified_at: today })
      .eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { last_verified_at: today };
  });

export const deleteStandingEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { error } = await context.supabase
      .from("standing_events")
      .delete()
      .eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
