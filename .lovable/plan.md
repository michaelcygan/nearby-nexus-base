## Today, rebuilt as the community homepage

Verified against the current repo before writing this:

- `src/routes/$slug.tsx` renders a large masthead (4xl/6xl H1, tagline, subarea line) plus a full `Post to {name}` button; `PageContainer` adds `py-8` and the child route adds `pt-6`.
- `src/routes/$slug.index.tsx` prints the whole `community.about` paragraph directly under the tabs.
- `BoardContent`'s `TodayBoard` is the generic post list with `types: null`, plus the existing density-aware `NearbyToday` (5 mi, plans+marketplace, max 4, 2 per community) — that logic is already correct and will be reused.
- Empty Today renders the shared dashed `EmptyState` with a second `PostToCommunity` button.
- `BoardFilters` is a non-sticky overflow row; `SiteHeader` is a 56px sticky bar with a "Guidelines" link.
- `center_lat` / `center_lng` already exist and are backfilled for Edgewater (41.987, -87.66), Lakeview (41.94, -87.6539), Lincoln Park (41.9214, -87.6513). Pittsburgh demos are `draft` with null coords.
- No civic-provider columns exist yet. `visibleNow()` in `data.server.ts` already enforces active + unexpired for both listings and counts, so no correction is needed there — I'll add regression coverage instead of changing it.
- `lucide-react` and `zod` are already dependencies; no new runtime packages needed.

Governing rules from the nearby-discovery brief are unchanged: one canonical home community per post, local default, nearby as a lens, radius/city only for Plans and Marketplace, Help and Places local, nearby cards always linking to their true community URL.

### Wave 1 — Community page frame

- `SiteHeader`: hide the Guidelines link below `sm` (footer keeps it); tighten brand/Sign-in weight so they don't compete with the neighborhood name.
- `$slug.tsx` masthead: uppercase `CHICAGO, ILLINOIS` eyebrow, H1 at `text-3xl sm:text-5xl`, tagline clamped to two lines, subarea line kept. Reduce `PageContainer`/child vertical padding.
- `PostToCommunity` gains a compact label: trigger reads `Post` on mobile, `Post to {name}` from `sm` up. Menu items and the signed-out redirect/action stash are untouched.
- `BoardFilters`: sticky at `top-14`, opaque-enough background, consistent edge padding, no clipped labels, visible selected state, keyboard focus rings.
- Remove the `about` paragraph from under the tabs.
- Replace the oversized Today empty state with a compact editorial one ("Nothing posted yet today.") and drop the duplicate large Post button.
- Verify at 390px and desktop; lint + production build.

### Wave 2 — Provider foundation

Forward-only migration (coords already exist, so only provider config is added):

- `neighborhoods.civic_provider text`, `neighborhoods.civic_area_codes text[] not null default '{}'`.
- Trigger-based validation for lat/lng range and both-or-neither (constraints only where immutable).
- Backfill: `chicago_socrata` + area `77` (Edgewater), `6` (Lakeview), `7` (Lincoln Park).
- Grants/RLS unchanged; new columns are readable by the existing published-community select policy.
- New `src/features/community-today/types.ts` with `CommunityWeather`, `WeatherAlert`, `OfficialCommunityItem`, `CivicServicePulse`; add the columns to `Neighborhood` and `NEIGHBORHOOD_COLUMNS`.
- Unit coverage for defensive parsers with mocked payloads. Nothing user-visible yet.

### Wave 3 — Weather

- `weather.server.ts`: server-only NWS provider behind one module interface. `/points/{lat},{lng}` → forecast + nearest station observation + active alerts, all Zod-parsed, with per-call timeouts and `Promise.allSettled`.
- Headers: `User-Agent: neighborhood.today (https://neighborhood.today)`, `Accept: application/geo+json`. Allow-listed origin only; no following arbitrary upstream URLs beyond the documented point payload.
- In-process TTL cache: points/station ~24h, forecast ~20m, observation ~10m, alerts ~5m. No DB cache — the Worker runtime supports module-scope memo plus React Query staleTime, which is the smallest sufficient primitive.
- Normalize to `CommunityWeather`; forecast-only temps are labeled as forecast.
- `WeatherStrip`: one printed utility line (temp, condition, high/low), optional secondary line (precip, wind), small Lucide icon, NWS attribution, accessible labels, community timezone. Separate compact alert block rendered only when an alert exists.
- Weather failure renders a one-line unavailable note and never fails the route.

### Wave 4 — Dedicated Today homepage

- `TodayHome` replaces `TodayBoard`; `BoardContent` branches `today → TodayHome`, `places → PlaceList`, else `ScopedPostList` unchanged.
- `neighborhoodTodayQuery(slug)` + server fn aggregating community identity, latest visible local posts (max 6), counts by type, Places preview (4). External modules stay independent queries so one failure can't cascade.
- Mobile order: weather → **On the board** → **Nearby today** (existing rules, only when local < 6) → **Explore the board** → official activity → From the City → **Useful places** → **About {community}** (collapsed disclosure).
- Explore the board: compact linked rows using local counts with zero-count fallback copy, linking through the existing `?view=` param. No new routes.
- Desktop: ~7/5 grid inside `max-w-5xl` — board + nearby in the main column, the supporting modules in the rail; single column on mobile.
- Route loader prefetches the internal Today query only.

### Wave 5 — Chicago public data

- `chicago.server.ts`: server-only Socrata adapter, optional `SOCRATA_APP_TOKEN` via `X-App-Token`, works anonymously, allow-listed host, timeouts, Zod parsing, 30–60m TTL cache.
- Library events (`vsdy-d8k7`): non-cancelled, not ended, within 14 days, `within_circle` ~2 mi of the center, ordered by start, small cap.
- Park activities (`tn7v-6rnw`): ~2 mi radius, display official `date_notes` — never a computed next occurrence.
- 311 (`v6vf-nfxy`): SoQL aggregate by `sr_type` over 7 days for the configured `community_area`, excluding duplicates, `311 INFORMATION ONLY CALL`, and aircraft-noise types; max 3 categories, no addresses or caller data, labeled window, Chicago 311 attribution.
- `Around {community}` shows max 3 items with per-source labels and `rel="noopener noreferrer"` external links; no RSVP/messaging on external records. Sections omit entirely when empty or when no provider is configured. Plain-text fields only — never `dangerouslySetInnerHTML`.

### Wave 6 — Launch hardening

Audit first-viewport usefulness, signed-out browsing with no interstitials, single Post CTA per viewport, sticky header/tab interaction, iOS safe areas, tab overflow, keyboard and screen-reader section labels, contrast, external-link safety, timeout/cache/rate-limit behavior, missing coords (Pittsburgh drafts, future towns), missing provider, empty vs dense boards, blocked-author and expired-post filtering, canonical URLs, and `/a/{code}` NFC destinations. Lint + production build; report files changed, schema impact, user-visible result, verification, and residual risks after each wave.

### Technical notes

- No published migration is edited; Wave 2 adds a single forward-only migration.
- All external calls are server-side; no browser geolocation, no maps, no client-visible upstream shapes.
- Existing Plans/Marketplace/Help/Places renderers, post detail, auth, messaging, moderation, participation, store, and NFC routes are untouched apart from the shared masthead/tab styling.
