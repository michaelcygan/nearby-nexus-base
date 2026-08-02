import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: { rpc: (...args: unknown[]) => unknown }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Admins only.");
}

/** Admins need every community, including drafts, to manage access points. */
export const listCommunitiesForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("neighborhoods")
      .select("id, slug, name, city, state_code, status")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAccessPoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("access_points")
      .select(
        "id, code, label, status, destination_path, scan_count, last_scanned_at, neighborhood_id",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

function randomCode(prefix: string) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let body = "";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) body += alphabet[byte % alphabet.length];
  return `${prefix}-${body}`;
}

export const createAccessPoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { neighborhoodId: string; label: string }) => ({
    neighborhoodId: String(data.neighborhoodId).slice(0, 64),
    label: String(data.label).trim().slice(0, 120) || "Untitled access point",
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);

    const { data: community, error: communityError } = await context.supabase
      .from("neighborhoods")
      .select("slug")
      .eq("id", data.neighborhoodId)
      .maybeSingle();
    if (communityError) throw new Error(communityError.message);
    if (!community) throw new Error("That community no longer exists.");

    const prefix = community.slug.slice(0, 2).toUpperCase();
    const { data: inserted, error } = await context.supabase
      .from("access_points")
      .insert({
        code: randomCode(prefix),
        neighborhood_id: data.neighborhoodId,
        label: data.label,
        destination_path: `/${community.slug}`,
      })
      .select("id, code")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const updateAccessPoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; label?: string; status?: "active" | "paused" }) => ({
    id: String(data.id).slice(0, 64),
    label: data.label === undefined ? undefined : String(data.label).trim().slice(0, 120),
    status: data.status === "active" || data.status === "paused" ? data.status : undefined,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const patch: { label?: string; status?: "active" | "paused" } = {};
    if (data.label) patch.label = data.label;
    if (data.status) patch.status = data.status;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await context.supabase.from("access_points").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
