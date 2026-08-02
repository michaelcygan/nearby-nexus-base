
# Lincoln Park, Chicago — next production community

## One correction before we start

I checked the database and the codebase: the only published community today is **Edgewater** (plus three Pittsburgh drafts: Lawrenceville, Bloomfield, Polish Hill). **There is no Lakeview community record and no Lakeview code anywhere in the project.** So this pass adds Lincoln Park as the *second* published community, and "leave Lakeview unchanged" is automatically satisfied — there is nothing to leave alone. Everything else in your brief lines up with what already exists.

The shared architecture you asked me to reuse is already in place and needs no rebuilding:
- Root-level community route (`/$slug`) with the one-page board and `view` filters (Today / Plans / Marketplace / Help / Places)
- Shared `BoardFilters`, `BoardContent`, post cards, empty states, participation flows, directory rendering
- "Post to {Community}" composer with sign-in return-path and intended-action preservation
- Directory detail pages that already print "Check the official website for current hours" instead of stored hours
- Admin access-point generator, anonymous aggregate scan counting, `/a/{code}` redirects
- Cross-community 404 guards on post and place detail routes

## 1. Database seed (one migration, idempotent)

- Upsert the `lincoln-park` community on the unique `slug`: name Lincoln Park, city Chicago, state IL, location type neighborhood, timezone America/Chicago, status published, with your exact tagline and about text.
- Insert the seven directory records, guarded so re-running produces no duplicates (matched on community + name). Categories, addresses, phones, websites and descriptions exactly as you listed; the `hours` column is left null so the UI shows "Check the official website for current hours".
- No posts, no participation, no users, no NFC codes are seeded.
- No writes touch Edgewater or the Pittsburgh drafts.

## 2. Empty board

Already handled by the shared component: with no active posts it renders "The Lincoln Park board is ready. Be the first neighbor to post." above the shared "Post to Lincoln Park" button. Nothing to build; I'll verify it renders for the new slug.

## 3. Metadata

Your requested title is "Lincoln Park Today — Neighborhood Today", while the shared community title today is "{Name}, {City} — Neighborhood Today". I'll change the shared pattern to `{Name} Today — Neighborhood Today` and the shared description to the "free public bulletin board for {Name}, {City}…" wording you specified, so every community — Edgewater included — gets consistent titling. Edgewater's URL, directory, data and published status are untouched; only its title/description text becomes consistent with the new pattern. Say the word if you'd rather Edgewater keep its current title.

Also:
- Canonical and og:url already resolve to `https://neighborhood.today/lincoln-park` via the existing SEO helper — verify, no change expected.
- Add a small shared keyword-meta helper so a community page can carry its search terms (Lincoln Park, Lincoln Park Chicago, DePaul neighborhood, Lincoln Park lakefront, Armitage, Lincoln Avenue Chicago) on the single canonical page. No extra routes, no duplicate SEO pages, no sub-neighborhood pages.

## 4. NFC access points

No code changes needed: the admin generator lists every published community, so Lincoln Park appears automatically once seeded, and generated codes redirect to `/lincoln-park`. I'll confirm in the running app that Lincoln Park is selectable, that a generated code produces a `/lincoln-park` destination, and that labels stay private admin metadata. Suggested labels (DePaul / Armitage / lakefront / general / unassigned) are entered by you at generation time, not seeded.

## 5. Verification pass

Against the running app and a production build:
- `/lincoln-park` returns 200 while logged out; Lincoln Park listed on the homepage next to Edgewater
- Edgewater board, directory and URLs still work
- Exactly one Lincoln Park record; exactly seven directory rows, each once
- Board empty with the intended message and shared composer; no invented activity
- Sign-in from the board returns to `/lincoln-park` with the intended posting action preserved
- An Edgewater post and place URL under `/lincoln-park/...` 404s
- 320px viewport with no horizontal overflow
- `tsgo --noEmit` and the production build pass

## Technical notes

- Files expected to change: one new migration; `src/routes/$slug.tsx` (title/description pattern); `src/lib/seo.ts` (keyword meta helper). No new Lincoln Park-specific components, routes, or data arrays.
- All community and directory data comes from the existing database-backed server functions — no mock arrays.
- Nothing added from the excluded list (stories, reviews, news, imported events, weather, maps, likes, DMs, payments/store nav, restaurant recs, sub-neighborhood pages, page builders).
