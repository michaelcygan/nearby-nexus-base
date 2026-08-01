import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { placeInputSchema } from "@/features/posts/schemas";

const PLACE_COLUMNS =
  "id, name, category, address, description, website, phone, hours, neighborhood_id";

/** Role check runs through the caller's own RLS-scoped client, never service role. */
async function requireAdmin(context: {
  supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }> };
  userId: string;
}) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Forbidden: directory listings are admin-managed.");
}

export const getMyAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true };
  });

export const listPlacesForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ neighborhoodId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { data: rows, error } = await context.supabase
      .from("places")
      .select(PLACE_COLUMNS)
      .eq("neighborhood_id", data.neighborhoodId)
      .order("category")
      .order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => placeInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { data: created, error } = await context.supabase
      .from("places")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const updatePlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ placeId: z.string().uuid(), values: z.unknown() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const values = placeInputSchema.parse(data.values);
    const { error } = await context.supabase
      .from("places")
      .update(values)
      .eq("id", data.placeId);
    if (error) throw new Error(error.message);
    return { id: data.placeId };
  });

export const deletePlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { error } = await context.supabase.from("places").delete().eq("id", data.placeId);
    if (error) throw new Error(error.message);
    return { deleted: true };
  });
