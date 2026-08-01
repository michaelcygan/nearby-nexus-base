Cloud balance is available, so implementation can resume from Wave 1. The design system, app shell, landing page, and legal pages are already built; everything below is new work.

## Wave 1 — Foundation + public neighborhood experience
Outcome: anyone can open `/n/{slug}`, understand the neighborhood, and browse tabs with real persisted data.

- Enable Lovable Cloud. Migrations: `neighborhoods`, `posts` (shared table: `type`, `neighborhood_id`, `author_id`, `title`, `body`, `status`, `expires_at`, `image_paths[]`, type-specific columns), `places` (Directory). Enums: `post_type` (plan, marketplace, volunteer), `post_status` (active, completed, expired, removed).
- GRANTs + RLS: `anon`/`authenticated` SELECT only where `status='active'`; nothing writable yet.
- Reuse existing tokens/`AppShell`; add `NeighborhoodSwitcher`, `PostCard`, tab nav.
- Routes: `/n/$slug` (overview), `/n/$slug/plans|marketplace|volunteer|directory`, `/n/$slug/p/$postId`, `/n/$slug/place/$placeId`; city landing list added to `/`. Public server fns via publishable-key client; loaders use `ensureQueryData`; every route gets `head()`, `errorComponent`, `notFoundComponent`.
- Seed migration with literal INSERTs: 3 neighborhoods (Lawrenceville, Bloomfield, Polish Hill), ~12 posts across types, ~10 directory places.
- States: loading skeletons, empty tabs, expired/removed post pages. Mobile-first single column → 2-col desktop; keyboard-navigable tabs, visible focus, no horizontal overflow.

## Wave 2 — Auth + lightweight profiles
- Email/password + Google (Lovable broker + `configure_social_auth`). `/auth`, `/reset-password`, `_authenticated/` gate.
- Migrations: `profiles` (display name, avatar, about, home neighborhood) with signup trigger; `user_roles` + `app_role` enum + `has_role()` security-definer; `saved_neighborhoods`.
- Storage: public `avatars` bucket, owner-scoped write policies.
- Routes: `/_authenticated/profile`, `/_authenticated/activity`, public `/u/$profileId`. Session-aware header with account menu + sign out (query teardown).

## Wave 3 — Post creation per module
- Type-specific columns + CHECK constraints (plan: starts_at, location, capacity; marketplace: price_cents, condition, free; volunteer: needed_by, slots).
- Storage: `post-images` bucket; upload with client-side resize + alt text.
- RLS: insert where `author_id = auth.uid()`; update/delete owner-only or admin via `has_role`. Owner-scoped SELECT so authors see their expired/removed posts.
- Shared `PostForm` shell + three thin type forms, zod schemas shared client/server; server fns for create/edit/complete/renew/remove.
- Routes: `/_authenticated/n/$slug/new/$type`, `/_authenticated/posts/$postId/edit`.

## Wave 4 — Participation, saves, post-scoped conversations
- Migrations: `plan_participants`, `saved_posts`, `saved_places`, `post_threads`, `thread_messages`.
- RLS: threads visible only to the two participants; messages insert only by participants while the post is active.
- `JoinPlanButton` (capacity-aware), `SaveButton`, `ThreadView`, `MessageComposer`.
- Routes: `/_authenticated/inbox`, `/_authenticated/threads/$threadId`, `/_authenticated/saved`.

## Wave 5 — Directory contribution + moderation
- Migrations: `place_submissions`, `reports`, `blocks`, `moderation_actions`; feed queries filter blocked authors.
- Routes: `/_authenticated/n/$slug/directory/suggest`, `/_authenticated/admin/reports`, `/admin/directory`, `/admin/neighborhoods`.
- Admin server fns role-checked server-side.

## Wave 6 — Neighborhood Store + orders
- Enable built-in Stripe payments (server-side checkout, webhook-confirmed orders).
- Migrations: `products`, `product_variants`, `orders`, `order_items`, `order_status` enum. Products public SELECT (active only); orders owner-read; writes webhook/service-role only.
- Routes: `/store`, `/store/$productSlug`, `/_authenticated/orders`, `/_authenticated/orders/$orderId`, `/admin/products`, `/admin/orders`, webhook at `/api/public/webhooks/stripe` with signature verification.

## Wave 7 — NFC access points, expiration, hardening, launch
- Migrations: `access_points`, `access_point_scans` (aggregate day counts only, no IP/user).
- `/a/$code` records anonymous scan then redirects; admin `/admin/access-points` with QR rendering.
- pg_cron → `/api/public/cron/expire-posts` (secret) flipping `active` → `expired`.
- Full audit: all personas in the brief, accessibility pass, SEO metadata/JSON-LD/sitemap, clean console/TS/build.

## Technical notes
- All app logic in `createServerFn`; `/api/public/*` only for the Stripe webhook, cron, and `/a/$code`. No Supabase Edge Functions.
- Public reads via publishable-key server client behind narrow `TO anon` policies; `supabaseAdmin` only inside verified webhook/cron handlers.
- Roles live in `user_roles` + `has_role()`, never on profiles.
- One `posts` table with typed columns and per-type CHECK constraints — no JSON blobs for relational data.
- Query hooks colocated per domain in `src/features/*`.

Deferred per brief: business pages, merchant storefronts, neighbor payments, bidding, reviews, followers, public metrics, general DMs, groups, ads, algorithmic ranking, native apps.

Work proceeds Wave 1 → 7, verifying each wave's primary workflow against real persisted data before moving on.