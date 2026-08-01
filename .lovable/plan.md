## Wave 6 — Neighborhood Store

A single operator-run store per neighborhood: admins create listings, neighbors buy them with card checkout, each listing is a one-of-a-kind item that goes "sold" once paid, and pickup is arranged locally (no shipping fields).

### 1. Enable payments
Enable Lovable's built-in Stripe payments (no Stripe account or API key needed to start — a test environment is created immediately; accepting real money later needs an account claim). Because these are physical goods, tax handling is set to calculation and collection only: Stripe computes and collects the right tax at checkout, and you handle registration/filing/remittance.

Then create the store products in Stripe from the listing details you give me (or seeded examples), each with a tax code matched to its product type.

### 2. Database
New tables:

- `store_listings` — neighborhood, title, description, price, currency, condition, photos, pickup notes, status (`draft`, `available`, `reserved`, `sold`, `archived`), Stripe product/price references, hidden/removed flags for moderation.
- `store_orders` — listing, buyer, buyer contact name/email, amount paid, currency, status (`pending`, `paid`, `cancelled`, `refunded`, `fulfilled`), Stripe checkout session + payment intent ids, pickup arrangement note, timestamps.

Access rules in plain English:
- Anyone can view available, non-hidden listings; admins can see and manage all of them.
- Buyers can see only their own orders; admins can see every order.
- Orders are never created or edited directly from the browser — only the server writes them, so prices and paid status can't be forged.
- A database check prevents two paid orders on the same one-of-a-kind listing.

Grants are added for every new table alongside the policies.

### 3. Server logic
- `listStoreListings` / `getStoreListing` — public reads through the publishable client, safe columns only.
- `createCheckoutSession` — authenticated: validates the listing is still available, re-reads the price from the database (never from the client), creates a Stripe Checkout Session with `automatic_tax`, records a `pending` order, returns the checkout URL.
- Stripe webhook at `src/routes/api/public/webhooks/stripe.ts` — verifies the signature over the raw body before anything else, then on `checkout.session.completed` marks the order `paid` and the listing `sold`; on expiry/cancel releases the listing back to `available`. Idempotent on session id.
- Admin functions: create/update/archive listing, list orders, mark an order `fulfilled` (picked up), cancel an order.

### 4. UI
- `/n/$slug/store` — new board tab beside Plans / Marketplace / Volunteer: grid of available listings with photo, price, condition, "Buy" CTA. Signed-out visitors see an inline "Sign in to buy" prompt rather than a redirect.
- `/n/$slug/store/$listingId` — listing detail: gallery, description, pickup notes, price with tax note, Buy button, report button (consistent with other content types).
- `/store/checkout/success` and `/store/checkout/cancelled` — public confirmation pages; success polls the order until the webhook marks it paid, then shows pickup instructions.
- `/orders` (authenticated) — the buyer's purchases with status and pickup notes.
- `/admin/store` (admin-only, linked from the account menu) — listing manager (create/edit/archive, reusing the existing image uploader with browser-side compression) and an order queue with a "picked up" action.
- Moderation: store listings become a reportable target so the existing moderator queue can hide or remove them.

### 5. SEO & verification
Unique `head()` metadata on every new content route (store index, listing detail), with the listing's photo as the OG image when one exists. Then a typecheck plus a browser pass over the store board, a listing page, the signed-out buy prompt, and the admin manager — checking for console errors and mobile overflow.

### Technical notes
- Prices are stored in integer cents; the checkout session amount always comes from the database row, never the request body.
- The webhook is the only writer of `paid` status; the success page never grants fulfilment on its own.
- Listing reservation is short-lived: creating a session marks the listing `reserved` with an expiry, and expired sessions release it.
- Multi-seller payouts (each neighbor paid directly) are deliberately out of scope — that needs Stripe Connect onboarding per seller and can be a later wave.
