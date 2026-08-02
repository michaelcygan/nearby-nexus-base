## Goal

Ship Edgewater, Chicago as the first real community board at `https://neighborhood.today/edgewater`, replacing the six-tab demo experience with one filtered page, and hide unfinished modules without deleting code.

## 1. Database (one migration + one idempotent seed)

Add to `neighborhoods`: `location_type` (enum: neighborhood/town/village/city, default neighborhood), `state_code`, `timezone` (default `America/Chicago`), `status` (enum draft/published, default draft).

- Public read policy narrowed to `status = 'published'`.
- Places/posts public reads must also require the parent community be published, and must exclude `hidden`/`removed` rows (posts and places) so hidden content and its signed images are not publicly readable.
- Lock down client writes on `posts`: a `BEFORE UPDATE` trigger that rejects author-supplied changes to `status`, `hidden`, `author_id`, `neighborhood_id`, counters (`going_count`, `volunteer_count`, `interested_count`), `created_at`; moderators keep their path via the existing security-definer functions.

New table `access_points`: `id`, `code` (unique, generated non-guessable, e.g. `EW-001` label plus random code), `neighborhood_id`, `label`, `status` (active/paused), `destination_path`, `scan_count`, `last_scanned_at`, timestamps. GRANTs: `authenticated` select/insert/update, `service_role` all; admin-only RLS. No IP, device, location, or identity columns.

Seed (idempotent, `ON CONFLICT (slug) DO UPDATE` / `WHERE NOT EXISTS`):
- Edgewater with exactly the specified name, city, state, type, timezone, status, tagline, about.
- `UPDATE neighborhoods SET status='draft' WHERE slug IN ('lawrenceville','bloomfield','polish-hill')` — explicit slug list only.
- The four verified Edgewater places, matched on (neighborhood_id, name) so re-running does not duplicate. `hours` left null.
- One access point for Edgewater labelled for the first NFC batch.

## 2. Public URL model

- New `src/routes/$slug.tsx` (layout) + `$slug.index.tsx` — actually a single leaf route `src/routes/$slug.tsx` rendering the board. Loader resolves the slug; unknown or unpublished → `notFound()` (real 404).
- A reserved-slug list (`auth`, `admin`, `profile`, `posts`, `post`, `messages`, `orders`, `privacy`, `terms`, `community-guidelines`, `guidelines`, `reset-password`, `store`, `a`, `api`, `n`, `u`) is enforced in the loader and in slug validation. TanStack matches static routes before `$slug`, so existing pages keep precedence.
- Legacy redirects (permanent, 301) via `beforeLoad` on the existing `/n/$slug` routes: base → `/$slug`; `plans|marketplace|volunteer|directory` → `/$slug?view=plans|marketplace|help|places`. Post/place detail legacy paths redirect to the new detail paths.
- Detail routes move under the community: `/$slug/p/$postId` and `/$slug/place/$placeId`. Both validate the record's neighborhood slug matches the URL slug; mismatch → `notFound()` (cross-community URLs 404).
- `src/lib/seo.ts`: `SITE_ORIGIN = "https://neighborhood.today"`. Remove remaining `nearby-nexus-base.lovable.app` strings (notably `admin.access-points.tsx`).

## 3. One-page community experience

`src/routes/$slug.tsx` renders:
- Header: `Edgewater` as the largest element (h1), `Chicago, Illinois` beneath, `Neighborhood Today` as smaller parent brand in the shell header.
- Validated `view` search param: `today | plans | marketplace | help | places` (default `today`). Filters are `<Link>`s that change only the search param — one implementation, no per-filter pages. Reuses `neighborhoodPostsQuery`, `neighborhoodPlacesQuery`, `PostCard`, `PostFeed` internals, and the existing places list markup.
- `Post to Edgewater` button opening a small composer chooser with three plain-language actions (Make a plan / Sell or give something away / Ask for help) mapping to plan/marketplace/volunteer and linking to `/post/new` with `type` + `returnTo` search params.
- Empty state: exactly "The Edgewater board is ready. Be the first neighbor to post." plus the post button. No invented content.
- Author display name shown on each post (join `profiles.display_name`); no email ever selected.
- Filter row scrolls horizontally with no page overflow at 320px.

Delete the six tab routes (`n.$slug.*`) after the redirects are in place; keep `neighborhood-tabs.tsx` removed from public nav.

## 4. Auth return path

`/auth` gains validated `redirect` (same-origin path only) and `action` search params. On session establishment it navigates to that path instead of `/profile`; OAuth `redirect_uri` stays `window.location.origin` with the intended path preserved in `sessionStorage` + the auth-page query param. `/post/new` when unauthenticated sends the visitor to `/auth?redirect=/edgewater&action=plan`.

## 5. NFC access points

- `src/routes/a.$code.tsx` — server handler: looks up an active code, increments `scan_count` and sets `last_scanned_at` through a security-definer function (aggregate only, nothing per-visitor), returns a 302 to the destination path (`/edgewater`). Unknown/paused codes → 302 to `/`.
- `/admin/access-points` rewritten to generate, label, pause/resume, and copy `https://neighborhood.today/a/{code}` per community. No analytics dashboard beyond the aggregate count and last-scan timestamp.
- Privacy page updated to describe exactly this: an anonymous aggregate scan counter, no IP, device, location, or identity data.

## 6. Scope cuts (hide, don't delete)

Remove Store/Stripe, saved-neighborhoods, and messaging entries from `site-header.tsx`, `account-menu.tsx`, and the community page. Route files and server functions stay in place, unreferenced from public navigation. Homepage rewritten to list only published communities (so: Edgewater) and drop the five-module pitch that mentions Store.

## 7. Correctness fixes

- Timezone: `formatDate/formatDateTime/formatTimestamp` take a timezone argument sourced from the community row; the hardcoded `America/New_York` constant is removed. Formatters are memoised per timezone so SSR and client strings still match.
- Remove the production "Edit with Lovable" badge via publish settings.

## 8. Verification

`tsgo` typecheck, production build, and a Playwright pass: `/edgewater` 200 while logged out, 320px width with no horizontal overflow, each filter view, homepage shows only Edgewater, a Pittsburgh post URL under `/edgewater` 404s, `/n/edgewater/plans` redirects to `/edgewater?view=plans`, `/a/{code}` redirects and increments once, and the SSR HTML contains the `neighborhood.today` canonical and og:url.

### Technical notes

- The migration and the seed are separate operations: schema changes through the migration tool, row seeding through the data-insert tool, both written to be safe on re-run.
- `$slug` is a root-level dynamic route, so every new top-level static page added later must be added to the reserved-slug list too — this is documented in `src/routes/README.md`.
