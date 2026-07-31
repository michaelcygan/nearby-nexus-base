# Neighborhood Today — V1 Implementation Plan

Blank TanStack Start template (React 19, Tailwind v4, shadcn/ui, TanStack Query, zod, sonner already installed; no backend yet). Nothing to preserve except template scaffolding, so V1 is built cleanly on it.

Design: "Warm civic print" — paper `#F7F3EC`, ink `#1C1A17`, brick `#B4472A`, garden `#3F6B4F`; editorial serif headings + humanist sans body, defined once as oklch tokens in `src/styles.css`.

Seed neighborhoods: three named neighborhoods in one city (defaults: Lawrenceville, Bloomfield, Polish Hill — say the word and I'll swap in yours).

---

## Wave 1 — Foundation + public neighborhood experience
Outcome: anyone can open `/n/{slug}`, understand the neighborhood, and browse tabs.

- Enable Lovable Cloud. Migrations: `neighborhoods`, `posts` (shared table: `type`, `neighborhood_id`, `author_id`, `title`, `body`, `status`, `expires_at`, `image_paths[]`, type-specific columns), `places` (Directory). Enums: `post_type` (plan, marketplace, volunteer), `post_status` (active, completed, expired, removed).
- GRANTs + RLS: `anon`/`authenticated` SELECT only where `status='active'` and not removed; nothing writable yet.
- Design tokens, `AppShell`, header/footer, `NeighborhoodSwitcher`, `PostCard`, `EmptyState`, `ErrorState`, skeletons.
- Routes: `/` (city landing, neighborhood list), `/n/$slug` (overview), `/n/$slug/plans|marketplace|volunteer|directory`, `/n/$slug/p/$postId`, `/n/$slug/place/$placeId`. Public server fns via publishable-key client; loaders use `ensureQueryData`; every route has `head()`, `errorComponent`, `notFoundComponent`.
- Seed migration: 3 neighborhoods, ~12 posts across types, ~10 directory places (real seed rows, not mocks).
- States: loading skeletons, empty tabs, expired/removed post pages. Mobile-first single column → 2-col desktop; keyboard-navigable tabs, visible focus, no horizontal overflow.
- Deferred: search, geospatial discovery.

## Wave 2 — Auth + lightweight profiles
Outcome: sign up/in, complete a profile, save neighborhoods.

- Email/password + Google (broker + `configure_social_auth`). `/auth`, `/reset-password`, `_authenticated/` gate.
- Migrations: `profiles` (display name, avatar, about, home neighborhood) with signup trigger; `user_roles` + `app_role` enum + `has_role()` security-definer; `saved_neighborhoods`.
- Storage: `avatars` bucket (public) with owner-scoped write policies.
- RLS: profiles readable by all, writable by owner; saves owner-only.
- Routes: `/_authenticated/profile`, `/_authenticated/activity`, public `/u/$profileId`. Session-aware header (account menu + sign out with query teardown).
- Tests: anon redirect, signed-in profile edit, avatar upload, non-owner cannot edit.

## Wave 3 — Post creation per module
Outcome: members publish Plans, Marketplace items, Volunteer needs.

- Type-specific columns/constraints (plan: starts_at, location, capacity; marketplace: price_cents, condition, free flag; volunteer: needed_by, slots) with CHECK constraints per type.
- Storage: `post-images` bucket; upload component with client-side resize, alt text.
- RLS: insert where `author_id = auth.uid()` and author has a profile; update/delete owner-only; admins via `has_role`.
- Shared `PostForm` shell + three thin type forms, zod schemas shared client/server; server fns for create/edit/complete/renew/remove (status transitions validated server-side).
- Routes: `/_authenticated/n/$slug/new/$type`, `/_authenticated/posts/$postId/edit`.
- Owner-visible drafts/expired reads via owner-scoped SELECT policy + owner fetchers.
- Tests: full create → view → edit → complete → renew → remove; non-owner blocked.

## Wave 4 — Participation, saves, post-scoped conversations
Outcome: join Plans, save posts/places, private per-post threads.

- Migrations: `plan_participants`, `saved_posts`, `saved_places`, `post_threads` (post + participant + author), `thread_messages`.
- RLS: thread rows visible only to the two participants; messages insert only by participants and only while post is active; blocks enforced in policy.
- Components: `JoinPlanButton` (capacity-aware), `SaveButton`, `ThreadView`, `MessageComposer`.
- Routes: `/_authenticated/inbox`, `/_authenticated/threads/$threadId`, `/_authenticated/saved`.
- States: full plan, already joined, thread on removed/expired post (read-only).
- Deferred: general DMs, group chat, read receipts, offers/bidding.

## Wave 5 — Directory contribution + moderation
Outcome: members submit places/corrections; report and block; admins moderate.

- Migrations: `place_submissions` (add/correction, status), `reports` (target type/id, reason, status), `blocks`, `moderation_actions`.
- RLS: submitters see own submissions; reports insert-only for authenticated, readable by admins; blocks owner-only. Feed queries filter blocked authors.
- Routes: `/_authenticated/n/$slug/directory/suggest`, `/_authenticated/admin/reports`, `/admin/directory`, `/admin/neighborhoods`.
- Admin server fns: approve/reject submission, remove/restore content, all role-checked server-side.
- Tests: blocked-user visibility both directions, admin remove → public 404/removed state, non-admin gets Forbidden.

## Wave 6 — Neighborhood Store + orders
Outcome: buy merch; admins manage products and fulfillment.

- Enable built-in Stripe payments (server-side checkout, webhook-confirmed orders).
- Migrations: `products`, `product_variants` (size/color, price, stock), `orders`, `order_items`, `order_status` enum (pending, paid, fulfilled, cancelled, refunded).
- RLS: products public SELECT (active only); orders owner-read; writes service-role/webhook only.
- Storage: `product-images` bucket.
- Routes: `/store`, `/store/$productSlug`, `/_authenticated/orders`, `/_authenticated/orders/$orderId`, `/admin/products`, `/admin/orders`. Webhook at `/api/public/webhooks/stripe` with signature verification.
- Tests: test-mode purchase → webhook → order visible; out-of-stock variant; cancelled checkout.

## Wave 7 — NFC access points, expiration, hardening, launch
Outcome: QR/NFC entry, privacy-safe scan counts, polished V1.

- Migrations: `access_points` (neighborhood, label, code, destination), `access_point_scans` (aggregate day counts only — no IP/user).
- Route `/a/$code` → records anonymous scan, redirects to destination; admin `/admin/access-points` with QR rendering.
- Scheduled expiration (pg_cron → `/api/public/cron/expire-posts` with secret) flipping `active` → `expired`.
- Legal/policy pages: `/terms`, `/privacy`, `/community-guidelines`.
- Full-project audit across all 15 personas in the brief, accessibility pass (focus, labels, contrast, reduced motion), SEO metadata/JSON-LD/sitemap, console/TS/build clean, seed sanity.

---

## Technical notes
- All server logic in `createServerFn`; `/api/public/*` only for Stripe webhook, cron, and `/a/$code`. No Supabase Edge Functions.
- Public reads use publishable-key server client behind narrow `TO anon` policies; `supabaseAdmin` only inside webhook/cron handlers after verification.
- Roles in `user_roles` + `has_role()`; never on profiles.
- Post types share one `posts` table with typed columns and CHECK constraints — no JSON blobs for relational data.
- Query hooks colocated per domain (`src/features/*`), one source of truth for mobile and desktop.

## Deliberately deferred (per brief)
Business accounts/pages, menus, merchant storefronts, artist payouts, neighbor payments, bidding, reviews/ratings, followers, public popularity metrics, general DMs, groups, ads, boosts, algorithmic ranking, native apps, multi-city admin beyond the data model.

Implementation starts at Wave 1 and proceeds sequentially, verifying each wave's primary workflow with real persisted data before moving on.