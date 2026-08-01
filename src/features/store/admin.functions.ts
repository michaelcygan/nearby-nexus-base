import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { attachImageUrls, signPostImages } from "@/features/posts/data.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStripeErrorMessage } from "@/lib/stripe.server";

import { ensureListingProduct } from "./checkout.server";
import type { AdminStoreListing, AdminStoreOrder } from "./types";

const ADMIN_LISTING_COLUMNS =
  "id, neighborhood_id, title, description, price_cents, currency, condition, pickup_notes, image_paths, status, stripe_product_id, hidden, removed, created_at, neighborhoods:neighborhood_id(slug, name)";

const listingInput = z.object({
  id: z.string().uuid().optional(),
  neighborhood_id: z.string().uuid(),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(4000),
  price_dollars: z.coerce.number().min(0.5).max(1_000_000),
  condition: z.string().trim().max(80).optional().or(z.literal("")),
  pickup_notes: z.string().trim().max(500).optional().or(z.literal("")),
  image_paths: z.array(z.string().max(300)).max(6).default([]),
  publish: z.boolean().default(false),
  environment: z.enum(["sandbox", "live"]),
});

type AuthedContext = {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" | "moderator" | "member" },
    ) => Promise<{ data: unknown }>;
  };
  userId: string;
};

async function requireAdmin(context: AuthedContext) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Forbidden: the store is managed by admins.");
}

export const getMyStoreRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true };
  });

export const listAllStoreListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as never);
    const { data, error } = await context.supabase
      .from("store_listings")
      .select(ADMIN_LISTING_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const urls = await signPostImages(
      context.supabase as never,
      rows.flatMap((row) => row.image_paths ?? []),
    );
    return attachImageUrls(rows, urls).map((row) => ({
      ...row,
      neighborhood: row.neighborhoods as { slug: string; name: string } | null,
    })) as unknown as AdminStoreListing[];
  });

export const saveStoreListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => listingInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { supabase, userId } = context;

    const row = {
      neighborhood_id: data.neighborhood_id,
      title: data.title,
      description: data.description,
      price_cents: Math.round(data.price_dollars * 100),
      condition: data.condition ? data.condition : null,
      pickup_notes: data.pickup_notes ? data.pickup_notes : null,
      image_paths: data.image_paths,
    };

    let listingId = data.id ?? null;

    if (listingId) {
      const { error } = await supabase
        .from("store_listings")
        .update({ ...row, ...(data.publish ? { status: "available" as const } : {}) })
        .eq("id", listingId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await supabase
        .from("store_listings")
        .insert({
          ...row,
          created_by: userId,
          status: data.publish ? "available" : "draft",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      listingId = created.id;
    }

    if (data.publish && listingId) {
      try {
        await ensureListingProduct(
          {
            id: listingId,
            title: data.title,
            description: data.description,
            stripe_product_id: null,
          },
          data.environment,
        );
      } catch (error) {
        // The listing is saved either way; surface the payment-side problem.
        return { id: listingId, warning: getStripeErrorMessage(error) };
      }
    }

    return { id: listingId };
  });

export const setStoreListingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        listingId: z.string().uuid(),
        status: z.enum(["draft", "available", "archived"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { error } = await context.supabase
      .from("store_listings")
      .update({ status: data.status, reserved_until: null })
      .eq("id", data.listingId);
    if (error) throw new Error(error.message);
    return { status: data.status };
  });

export const listStoreOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as never);
    const { data, error } = await context.supabase
      .from("store_orders")
      .select(
        "id, listing_id, buyer_id, buyer_email, amount_cents, currency, status, pickup_note, created_at, paid_at, fulfilled_at, store_listings:listing_id(id, title, pickup_notes)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const buyerIds = [...new Set(rows.map((row) => row.buyer_id).filter(Boolean))] as string[];
    const { data: profiles } = buyerIds.length
      ? await context.supabase.from("profiles").select("id, display_name").in("id", buyerIds)
      : { data: [] as Array<{ id: string; display_name: string }> };
    const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    return rows.map((row) => ({
      ...row,
      buyer_name: row.buyer_id ? (names.get(row.buyer_id) ?? "Neighbor") : null,
      listing: row.store_listings as { id: string; title: string; pickup_notes: string | null } | null,
    })) as unknown as AdminStoreOrder[];
  });

export const updateStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(["fulfilled", "cancelled", "refunded"]),
        pickup_note: z.string().trim().max(300).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { error } = await context.supabase
      .from("store_orders")
      .update({
        status: data.status,
        ...(data.status === "fulfilled" ? { fulfilled_at: new Date().toISOString() } : {}),
        ...(data.pickup_note ? { pickup_note: data.pickup_note } : {}),
      })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { status: data.status };
  });
