## Goal

Add nearby and citywide discovery as query-time lenses over the existing board, without duplicating posts, adding navigation, or changing the visual system. Every post keeps one owning community; cards link to their canonical community URL.

## What I confirmed by reading the repo

- `src/routes/$slug.index.tsx` validates only `view`, uses `loaderDeps` + `ensureQueryData`, and canonicalizes on community + view.
- `BoardContent` renders one post list (`neighborhoodPostsQuery(slug, type)`) and applies blocked-author filtering client-side.
- `PostCard` builds its link from the page `slug` — this is what must change for nearby cards.
- `fetchNeighborhoodPosts` filters `status = 'active'` only; there is **no** `expires_at` filter today (same for `fetchNeighborhoodCounts`). This is the correctness bug called out in the brief and I will fix it in the scoped-query work.
- `neighborhoods` has no coordinate columns.
- Scripts available: `lint`, `build`, `build:dev`. There is **no test runner installed** (no vitest/jest, no test files). Rather than add a dependency, I will verify the distance helper with a temporary throwaway Node script during Wave 1 and report the boundary results. If you'd prefer real committed unit tests, say so and I'll add vitest as a devDependency.

## Wave 1 — Geographic foundation (no UI change)

- New forward-only migration: add `center_lat double precision`, `center_lng double precision` to `neighborhoods`, nullable, plus CHECK constraints (lat -90..90, lng -180..180, both-or-neither present).
- Backfill approximate community centers for the three published communities (Edgewater, Lakeview, Lincoln Park), documented in the migration as approximate discovery anchors, not boundaries. Draft Pittsburgh communities stay null.
- Add `src/features/discovery/distance.ts`: pure `haversineMiles(a, b)` and `withinRadius`.
- Extend `Neighborhood` type with the two nullable coordinate fields.
- Verify: migration applies, existing boards unchanged, `lint` + production build pass.

## Wave 2 — Marketplace vertical slice

Server:
- `src/features/discovery/scope.server.ts`: `resolveCommunityScope({ originCommunity, scope, radiusMiles })` → published communities with valid coordinates plus distance from origin. `city` scope matches normalized city + state, excludes drafts, ignores radius. Missing origin coordinates → local-only fallback.
- Refactor `fetchNeighborhoodPosts` into a scoped fetcher returning `{ local: ScopedPost[]; nearby: ScopedPost[] }`, where each post carries `origin: PostOrigin` and nearby posts carry `distance_miles`. Add the missing `expires_at is null or expires_at > now()` filter to every public post read and to `fetchNeighborhoodCounts`.
- Nearby ordering: local first, then other communities by distance, newer posts first within equal distance. Preserve the current overall limit; no pagination.
- Server-fn input validation: `scope ∈ {local,nearby,city}`, `radius ∈ {3,5,10}`, radius ignored unless nearby, anything unsupported → local.

Client:
- Extend `$slug.index.tsx` `validateSearch` with `scope` and `radius`; local = params omitted; nearby without radius defaults to 5; today/help/places normalize to local. Board tab links reset scope/radius so a Marketplace radius never leaks into Help.
- React Query key gains slug, type, scope, radius, limit.
- `PostCard` takes the post's origin slug for its link and optionally renders a quiet origin line (`From Lake View · 2.4 mi`, one decimal). Local-only lists show no origin line.
- New `ScopeControl` component below the board tabs: `Edgewater | Nearby | Chicago`, revealing `3 mi 5 mi 10 mi` when Nearby is active. Existing button/border/focus/selected conventions, semantic keyboard-accessible links, no location language, no map.
- Marketplace renders two labeled groups (`In Edgewater`, `Nearby`), blocked-author filtering applied to both.
- Canonical stays `/edgewater?view=marketplace` regardless of scope/radius.

Verify: local, 3/5/10-mile, city, and empty behaviors; a Lakeview card from Edgewater routes to `/lakeview/p/{id}` while `/edgewater/p/{id}` still refuses it; invalid params fall back; 320px has no overflow; lint + build.

## Wave 3 — Today density fallback

- Reuse the resolver to fetch a bounded pool of nearby `plan` + `marketplace` candidates at 5 miles (never `volunteer`).
- After client blocked-author filtering: if fewer than 6 visible local posts, append a `Nearby today` section — at most 4 cards, at most 2 per neighboring community, only enough to reach 6, newer first with distance as tiebreak.
- Zero local posts keeps the existing "Be the first neighbor to post" invitation, with `Nearby today` beneath it. Six or more visible local posts injects nothing. No scope control on Today.

## Wave 4 — Plans and city scope completion

- Reuse the same scope control and query contract for Plans.
- Finish city scope for Marketplace and Plans with exact normalized city + state matching, drafts excluded.
- Hide the citywide option on `town`, `village`, and `city` pages (redundant); Nearby still works there.
- Confirm nearby may cross municipal boundaries while city scope may not; verify canonical URLs and back/forward history restore scope.

## Wave 5 — Hardening and QA

De-duplicate query/UI logic, confirm no new packages, no replaced routes, no edited published migrations, RLS still authoritative, expired/hidden/blocked content cannot surface, loading/error/empty states, keyboard and screen-reader labels, 320px layout, SSR/hydration stability, NFC links to the three communities unchanged. Full lint + build, then a final diff review for unrelated changes.

## Technical notes

- No PostGIS, no mapping SDK, no geocoding, no browser geolocation. Radius is measured community-center to community-center on the server; all distance math stays out of React.
- Contract shape: `DiscoveryScope = "local" | "nearby" | "city"`, `RadiusMiles = 3 | 5 | 10`, `ScopedPostsResult = { local: PostSummary[]; nearby: PostSummary[] }` with `origin` and `distance_miles` attached — designed so a later PostGIS swap needs no route, component, or query-contract change.
- Nearby resolution failure degrades to the local board rather than erroring the page.

I will report changed files, migration impact, verification, and open risks after each wave, and stop rather than continue past a broken build or migration.
