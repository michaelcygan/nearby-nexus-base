## What's already in place

I checked the database and code: published communities today are **Edgewater** and **Lincoln Park** (Pittsburgh's Lawrenceville, Bloomfield, Polish Hill remain drafts). There is no Lakeview record yet. The shared architecture you asked me to reuse already exists and needs no rebuilding:

- Root-level community route `/$slug` with the one-page board and `view` filters (Today / Plans / Marketplace / Help / Places)
- Shared `BoardFilters`, `BoardContent`, post cards, empty state, participation, directory rendering
- "Post to {Community}" composer with sign-in return path and preserved intended action
- Directory detail pages that print "Check the official website for current hours" instead of stored hours
- Admin access-point generator listing every published community, anonymous aggregate scan counts, `/a/{code}` redirects
- Cross-community 404 guards on post and place detail routes

## 1. Database seed (one migration, idempotent)

- Upsert the `lakeview` community on the unique `slug`: name Lakeview, city Chicago, state IL, location type neighborhood, timezone America/Chicago, status published, with your exact tagline and about text.
- Insert the seven directory records guarded on (community + name) so re-running creates no duplicates. Categories, addresses, phones, websites and descriptions exactly as listed; `hours` left null so the UI shows the official-website line.
- No posts, participation, users, or NFC codes are seeded.
- No writes touch Edgewater, Lincoln Park, or the Pittsburgh drafts.

## 2. Subarea context line

Lakeview needs quiet secondary context under the community name: `Lakeview East · Northalsted · Wrigleyville`. I'll add this as a small shared per-community lookup (same file as the existing keyword lookup), rendered by the shared `/$slug` header directly under the city/state line in muted small type. Communities without subareas render nothing, so Edgewater and Lincoln Park are visually unchanged. No new nav, no links, no filters.

## 3. Metadata

- Title comes out of the existing shared pattern as "Lakeview Today — Neighborhood Today" — no change needed.
- Your Lakeview description mentions the subareas, which the current shared description template can't express. I'll allow a per-community description override in the same lookup, falling back to today's shared wording for every other community. Edgewater and Lincoln Park keep their current descriptions.
- Search terms for the single canonical page: Lakeview, Lake View, Lakeview Chicago, Lakeview East, East Lakeview, Northalsted, Wrigleyville, Wrigley — added to the existing community keyword map. No duplicate pages, no subarea routes.
- Canonical and og:url already resolve to `https://neighborhood.today/lakeview` via the existing SEO helper; I'll verify rather than change.

## 4. NFC access points

No code changes. The generator lists published communities, so Lakeview appears once seeded and generated codes point at `/lakeview`. Your suggested labels (Northalsted / Wrigleyville / Lakeview East / general) are typed in at generation time, stay private admin metadata, and don't affect the destination. I'll confirm selection and destination in the running app.

## 5. Verification pass

Against the running app and a production build:

- `/lakeview` returns 200 while logged out; Lakeview listed on the homepage beside Edgewater and Lincoln Park
- Subarea line visible near the community name
- Edgewater board, directory, URLs and published status unchanged
- Exactly one Lakeview record; exactly seven directory rows, each once; no posts
- Board empty with "The Lakeview board is ready. Be the first neighbor to post." plus the shared "Post to Lakeview" button
- Sign-in from the board returns to `/lakeview` with the intended posting action preserved
- An Edgewater post/place URL under `/lakeview/...` 404s
- 320px viewport with no horizontal overflow
- `tsgo --noEmit` and the production build pass

## Technical notes

- Files expected to change: one new migration; `src/lib/seo.ts` (keywords, description override, subarea list); `src/routes/$slug.tsx` (render subarea line, use description override). No Lakeview-specific components, routes, or mock data arrays.
- All community and directory data comes from the existing database-backed server functions.
- Nothing added from the excluded list (stories, reviews, news, event APIs, maps, likes/followers, DMs, payments, store nav, subarea pages, subarea moderation or membership).
