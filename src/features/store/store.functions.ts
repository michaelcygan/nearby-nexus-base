import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStripeErrorMessage } from "@/lib/stripe.server";

import { createListingCheckout, reconcileBuyerOrder } from "./checkout.server";
import { fetchStoreListing, fetchStoreListings } from "./data.server";

const environmentSchema = z.enum(["sandbox", "live"]);

export const getStoreListings = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug).slice(0, 120) }))
  .handler(async ({ data }) => fetchStoreListings(data.slug));

export const getStoreListing = createServerFn({ method: "GET" })
  .inputValidator((data: { listingId: string }) => ({
    listingId: String(data.listingId).slice(0, 64),
  }))
  .handler(async ({ data }) => fetchStoreListing(data.listingId));

export const createStoreCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        listingId: z.string().uuid(),
        returnUrl: z.string().url().max(500),
        environment: environmentSchema,
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const { data: userData } = await context.supabase.auth.getUser();
      const clientSecret = await createListingCheckout({
        listingId: data.listingId,
        userId: context.userId,
        email: userData.user?.email ?? undefined,
        returnUrl: data.returnUrl,
        environment: data.environment,
      });
      return { clientSecret };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : getStripeErrorMessage(error),
      };
    }
  });

export const getMyStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ sessionId: z.string().min(6).max(200), environment: environmentSchema })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    try {
      return await reconcileBuyerOrder(data.sessionId, context.userId, data.environment);
    } catch (error) {
      throw new Error(getStripeErrorMessage(error));
    }
  });

export const listMyStoreOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("store_orders")
      .select(
        "id, listing_id, amount_cents, currency, status, pickup_note, created_at, paid_at, fulfilled_at, store_listings:listing_id(id, title, pickup_notes)",
      )
      .eq("buyer_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      ...row,
      listing: row.store_listings as { id: string; title: string; pickup_notes: string | null } | null,
    }));
  });
