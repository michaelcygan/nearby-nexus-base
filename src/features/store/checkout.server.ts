import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

const RESERVATION_MINUTES = 30;
/** Stripe tax code for general tangible goods — store items are physical. */
export const STORE_TAX_CODE = "txcd_99999999";

type CheckoutParams = {
  listingId: string;
  userId: string;
  email: string | undefined;
  returnUrl: string;
  environment: StripeEnv;
};

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length && found.data[0]) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email ? { email: options.email } : {}),
    metadata: { userId: options.userId },
  });
  return created.id;
}

/** Creates (once) the Stripe product that backs a listing, so receipts and the payments dashboard show a real name. */
export async function ensureListingProduct(
  listing: { id: string; title: string; description: string; stripe_product_id: string | null },
  environment: StripeEnv,
): Promise<string> {
  if (listing.stripe_product_id) return listing.stripe_product_id;

  const stripe = createStripeClient(environment);
  const product = await stripe.products.create({
    name: listing.title,
    description: listing.description.slice(0, 500),
    tax_code: STORE_TAX_CODE,
    shippable: false,
    metadata: { lovable_external_id: `store_listing_${listing.id}`, listing_id: listing.id },
  });

  await supabaseAdmin
    .from("store_listings")
    .update({ stripe_product_id: product.id })
    .eq("id", listing.id);

  return product.id;
}

export async function createListingCheckout(params: CheckoutParams): Promise<string> {
  const { data: listing, error } = await supabaseAdmin
    .from("store_listings")
    .select(
      "id, title, description, price_cents, currency, status, hidden, removed, reserved_until, stripe_product_id",
    )
    .eq("id", params.listingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!listing || listing.hidden || listing.removed) {
    throw new Error("That item is no longer available.");
  }

  const reservationActive =
    listing.status === "reserved" &&
    listing.reserved_until != null &&
    new Date(listing.reserved_until).getTime() > Date.now();

  if (listing.status === "sold") throw new Error("That item has already sold.");
  if (listing.status !== "available" && !(listing.status === "reserved" && !reservationActive)) {
    throw new Error(
      reservationActive
        ? "Someone else is checking out with this item right now. Try again in a few minutes."
        : "That item is not for sale right now.",
    );
  }

  const { data: settled } = await supabaseAdmin
    .from("store_orders")
    .select("id")
    .eq("listing_id", listing.id)
    .in("status", ["paid", "fulfilled"])
    .maybeSingle();
  if (settled) throw new Error("That item has already sold.");

  const productId = await ensureListingProduct(listing, params.environment);
  const stripe = createStripeClient(params.environment);
  const customerId = await resolveOrCreateCustomer(stripe, {
    ...(params.email ? { email: params.email } : {}),
    userId: params.userId,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ui_mode: "embedded_page",
    return_url: params.returnUrl,
    customer: customerId,
    // Physical, one-of-a-kind goods: Stripe calculates and collects tax; the
    // seller handles registration, filing and remittance.
    automatic_tax: { enabled: true },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: listing.currency,
          product: productId,
          unit_amount: listing.price_cents,
          tax_behavior: "exclusive",
        },
      },
    ],
    payment_intent_data: { description: listing.title },
    metadata: { listing_id: listing.id, userId: params.userId, kind: "store_listing" },
  });

  const { error: orderError } = await supabaseAdmin.from("store_orders").insert({
    listing_id: listing.id,
    buyer_id: params.userId,
    buyer_email: params.email ?? null,
    amount_cents: listing.price_cents,
    currency: listing.currency,
    status: "pending",
    environment: params.environment,
    stripe_session_id: session.id,
  });
  if (orderError) throw new Error(orderError.message);

  await supabaseAdmin
    .from("store_listings")
    .update({
      status: "reserved",
      reserved_until: new Date(Date.now() + RESERVATION_MINUTES * 60_000).toISOString(),
    })
    .eq("id", listing.id);

  return session.client_secret ?? "";
}

/** Only ever called from verified sources: the signed webhook, or a Stripe read of the real session. */
export async function markSessionPaid(
  sessionId: string,
  patch: { paymentIntentId?: string | null; email?: string | null },
) {
  const { data: order } = await supabaseAdmin
    .from("store_orders")
    .select("id, listing_id, status")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (!order || order.status === "paid" || order.status === "fulfilled") return;

  await supabaseAdmin
    .from("store_orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: patch.paymentIntentId ?? null,
      ...(patch.email ? { buyer_email: patch.email } : {}),
    })
    .eq("id", order.id);

  await supabaseAdmin
    .from("store_listings")
    .update({ status: "sold", reserved_until: null })
    .eq("id", order.listing_id);
}

export async function releaseSession(sessionId: string) {
  const { data: order } = await supabaseAdmin
    .from("store_orders")
    .select("id, listing_id, status")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (!order || order.status !== "pending") return;

  await supabaseAdmin.from("store_orders").update({ status: "cancelled" }).eq("id", order.id);
  await supabaseAdmin
    .from("store_listings")
    .update({ status: "available", reserved_until: null })
    .eq("id", order.listing_id)
    .eq("status", "reserved");
}

/**
 * Reads the buyer's own order for a checkout session and, when the webhook has
 * not landed yet, reconciles it against Stripe's own record of the session.
 */
export async function reconcileBuyerOrder(sessionId: string, userId: string, env: StripeEnv) {
  const { data: order } = await supabaseAdmin
    .from("store_orders")
    .select(
      "id, listing_id, status, amount_cents, currency, created_at, paid_at, fulfilled_at, pickup_note",
    )
    .eq("stripe_session_id", sessionId)
    .eq("buyer_id", userId)
    .maybeSingle();
  if (!order) return null;

  if (order.status === "pending") {
    const stripe = createStripeClient(env);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status && session.payment_status !== "unpaid") {
      await markSessionPaid(sessionId, {
        paymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
        email: session.customer_details?.email ?? null,
      });
    } else if (session.status === "expired") {
      await releaseSession(sessionId);
    }
  }

  const { data: fresh } = await supabaseAdmin
    .from("store_orders")
    .select("id, listing_id, status, amount_cents, currency, created_at, paid_at, fulfilled_at, pickup_note")
    .eq("id", order.id)
    .maybeSingle();

  const { data: listing } = await supabaseAdmin
    .from("store_listings")
    .select("id, title, pickup_notes, neighborhoods:neighborhood_id(slug)")
    .eq("id", order.listing_id)
    .maybeSingle();

  return {
    ...(fresh ?? order),
    listing: listing
      ? { id: listing.id, title: listing.title, pickup_notes: listing.pickup_notes }
      : null,
    slug: (listing?.neighborhoods as { slug: string } | null)?.slug ?? null,
  };
}
