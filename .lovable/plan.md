# Standing Neighborhood Events — Wave 0 audit and plan

## What the repo already gives us (verified by reading)

- **Communities**: `neighborhoods` — published today are only **Edgewater**, **Lakeview** (name "Lakeview", not "Lake View"), **Lincoln Park**, all `America/Chicago` with centers set. Pittsburgh rows are drafts.
- **Proximity**: `src/features/discovery/distance.ts` + `scope.server.ts` measure **community center to community center** — there is no per-venue geocoding, and `places` has no lat/lng columns. Nearby for events therefore reuses `resolveCommunityScope` unchanged; no second geospatial system, no new radius constant (`DEFAULT_RADIUS_MILES = 5`, options 3/5/10).
- **Posts**: `posts` is user-authored content with participation counts, capacity/price validation triggers, daily rate limits, and a trigger that freezes system fields. Curated venue series share almost none of those columns.
- **Public reads**: `src/lib/supabase-public.server.ts` (anon key, RLS enforced) used from `*.server.ts`, exposed via `createServerFn` in `*.functions.ts`, consumed through TanStack Query `queryOptions`.
- **Admin**: `src/routes/_authenticated/admin.*.tsx` screens call `*.functions.ts` guarded by `requireSupabaseAuth` + `has_role(uid,'admin')` through the caller's own RLS client. This is the exact pattern to copy.
- **Today / Plans**: `board-content.tsx` routes every view; `today-home.tsx` composes ambient sections in fixed order; `$slug.index.tsx` owns loaders and per-view SEO.
- **Dates**: `date-fns` v4 is installed (no tz add-on); display formatting is Intl-based in `features/neighborhoods/types.ts`.
- **Tests**: there is currently **no test runner installed** — Wave 1 adds `vitest` as a dev dependency to satisfy the recurrence-test requirement.

## Decision: one small dedicated table

Add `standing_events`. Extending `posts` would push recurrence, venue fallback, verification and image-approval columns into the table that user Plans, marketplace listings and help asks all validate against, and would make every Plans query filter out curated rows. A separate table keeps "resident posted this" and "an admin curated this venue series" semantically distinct, which the product definition requires.

## Proposed migration (Wave 1, forward-only)

Enums `standing_event_status` (`draft|active|paused`) and `standing_event_category` (`trivia|karaoke|bingo|games|drag|live_music|show_tunes|nightlife`).

`public.standing_events`: `id`, `source_key` **unique** (idempotent seeds), `neighborhood_id` → neighborhoods, `place_id` → places (nullable), `venue_name`, `venue_address`, `title`, `description`, `category`, `days_of_week smallint[]` (**0 = Sunday … 6 = Saturday**, documented in a column comment and in the shared type), `start_time time`, `end_time time`, `end_day_offset smallint default 0`, `timezone default 'America/Chicago'`, `origin text default 'curated_external'`, `source_url`, `image_url`, `image_attribution`, `exception_note`, `starts_on date`, `ends_on date`, `excluded_dates date[] default '{}'`, `status default 'draft'`, `last_verified_at`, `verified_by`, `created_by`, `created_at`, `updated_at` + `touch_updated_at` trigger. A validation trigger enforces: 1–7 weekday values in 0..6, `source_url` https, `image_url` https, `end_day_offset` 0 or 1.

**Grants + RLS**: `GRANT SELECT ON standing_events TO anon, authenticated`; full DML to `authenticated`; `ALL` to `service_role`. Policies: anyone may read rows where `status = 'active'` **and** the neighborhood is published (`is_published_community`); admins (`has_role(auth.uid(),'admin')`) may read all and insert/update/delete. Server functions re-check admin, so paused/draft rows are unreachable publicly at both layers.

**Seeds** run as `INSERT ... ON CONFLICT (source_key) DO UPDATE` so re-application never duplicates: Edgewater (4), Lakeview (14 series incl. Lark karaoke Fri+Sat and drag brunch Sat+Sun as multi-weekday rows, Roscoe's two seatings as one row with a schedule note, Sidetrack OUTspoken exception note, Murphy's Cubs-home-game note), Lincoln Park (12). `last_verified_at = 2026-08-01`, `status = active`, `image_url = null`.

**Meeting House Tavern (6 rows)**: Andersonville is not a community in the database, so per the brief these seed as **`status = 'draft'` with no neighborhood_id guess** — they stay invisible until a real geographic assignment exists. They will not be force-assigned to Edgewater.

The "do not publish" list (Burke's, Lark trivia, LP Tap House, Replay Smash, Clover Jeopardy, Waterfront, Kingston Mines, Beard & Belly) is not seeded at all.

## Recurrence primitive

`src/features/standing-events/recurrence.ts` — pure, no DB, no writes:

```
getStandingEventOccurrences(events, rangeStart, rangeEnd, viewerTimeZone)
  -> { event, startsAt, endsAt, dayLabel: "Today" | "Tomorrow" | "Thu, Aug 6",
       cadenceLabel: "Every Tuesday · 7:30 PM", isNearby, originSlug }
```

Timezone-safe via the `@date-fns/tz` companion for date-fns v4 (added in Wave 1) rather than hand-rolled offset math; DST transitions, multi-weekday series, after-midnight ends (`end_day_offset`), `starts_on` / `ends_on` / `excluded_dates` all covered by unit tests including a spring-forward and a fall-back date.

## Public surfaces (Wave 2)

- **Today**: a compact `HappeningToday` section placed after "On the board"/"Nearby today" and **before** "Explore the board", so weather, posts and civic sections keep their slots. Heading "Happening today"; when nothing is on today it shows the next three as "Coming up in {Neighborhood}", plus a "See this week" link to `?view=plans`. Single-column mobile stack, two columns at `sm`, no carousel, no hero images.
- **Card**: optional 72px thumbnail (lazy, `decoding="async"`, `referrerPolicy="no-referrer"`, fixed ratio, `object-cover`, local category fallback on error so nothing collapses), title, venue, `Today · 7:30 PM`, small category tag, `Nearby` badge only when applicable, external-link glyph. Footer line "Check with venue" and the source link as the only action — **no RSVP, join, counts, or messaging**.
- **Plans**: a "Standing local events" section above the post list showing the next 7 days, exact-neighborhood group before a clearly labelled nearby group, each chronological, visually distinct from resident Plans (border/label "Neighborhood event").
- Everything is anon-readable server-side, so logged-out mobile visitors reach a venue source in ≤2 taps. Empty states stop claiming a board is quiet when standing events exist.

## Image discovery (Wave 3)

This stack does not accept new Supabase Edge Functions, so `resolve-event-image` ships as an **admin-only server function** (`resolveEventImage`, `requireSupabaseAuth` + admin check) with the same contract the brief specifies: takes a **standing-event id**, loads the stored `source_url`, allows https only, rejects localhost/private/link-local/credentialed hosts, short timeout, limited redirects, capped HTML read, parses `og:image:secure_url` → `og:image` → `twitter:image`, resolves relative URLs, returns candidates for explicit admin approval. Nothing is saved automatically; visitor page loads never scrape.

## Files expected to change

New: `supabase` migration + seed migration; `src/features/standing-events/{types.ts,recurrence.ts,recurrence.test.ts,data.server.ts,standing-events.functions.ts,admin.functions.ts,queries.ts,image.server.ts}`; `src/components/standing-events/{standing-event-card.tsx,happening-today.tsx,standing-events-week.tsx,event-image.tsx,category-fallback.tsx}`; `src/routes/_authenticated/admin.standing-events.tsx`.

Edited: `today-home.tsx`, `board-content.tsx`, `$slug.index.tsx` (loader prefetch), `admin` nav/`account-menu.tsx`, `package.json` (`@date-fns/tz`, `vitest`).

## Waves and stop points

- **Wave 1** — migration, RLS, grants, generated types, idempotent seeds, admin list + form (pause/reactivate, verify now, excluded dates, direct image URL + preview, >30-day stale warning), recurrence utility + unit tests. No public behaviour change. Stop.
- **Wave 2** — Today and Plans surfaces, compact cards, logged-out verification, midnight/DST checks. Stop.
- **Wave 3** — admin-only image resolution + approval, safety rejections, fallback rendering. Stop.
- **Wave 4** — nearby via existing community radius with honest `Nearby` badges, stale filter, existing analytics hooks only, a11y/perf/responsive QA, regression pass, production build.

Each wave ends with build + typecheck + lint + tests, a change summary, and open assumptions.

## Risks and open items

1. **Andersonville/Uptown do not exist** as communities, so Meeting House stays draft-only — its 6 rows will not appear anywhere until a community is created for it (a later, separate decision).
2. **Nearby is neighborhood-granular**, not venue-granular; a Lakeview venue near the Lincoln Park line is 1.4 mi by community centers, which is what the existing lens already reports for posts. No per-venue coordinates are invented.
3. Lakeview's stored name is "Lakeview" — copy will use the stored name rather than "Lake View".
4. No test runner exists yet; Wave 1 introduces `vitest` solely for the recurrence tests.
5. `places` rows exist for a handful of venues only, so most seeds use the venue name/address fallback and `place_id` stays null.
