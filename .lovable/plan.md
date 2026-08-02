# Wave 2 — Standing events on the public board

Two new read-only sections, both driven by the Wave 1 recurrence engine and the existing public `getStandingEvents` server function. No schema changes, no new dependencies, no writes.

## What the reader sees

**Today homepage — "Happening today"**
- Sits directly under "On the board" / "Nearby today", above "Explore the board", so neighbor posts still come first.
- Only occurrences happening on the community's current local day (including a night that runs past midnight).
- Local community first; nearby communities fill in only when there are fewer than 3 local ones, capped at 4 items total and clearly labeled with the community name.
- Each row: event title, venue, "Today · 7:30 PM", category, and a "Check with venue" note linking out to the venue's own page.
- Absent entirely when nothing is on tonight — no empty box.

**Plans tab — "Standing local events"**
- Below the neighbor plans list (both the "In {community}" and "Nearby" sections), separated by a rule so it never reads as resident-posted.
- Next seven days, grouped by day heading ("Today", "Tomorrow", "Thu, Aug 6"), local community only.
- One line of context: recurring nights hosted by local venues, verify with the venue.
- Absent when the community has no active series.

## Technical notes

- New components: `src/components/community/standing-event-card.tsx` (shared row), `happening-today.tsx`, `standing-events-list.tsx`.
- Data: `standingEventsQuery` (already built) via `useQuery`, gated on `useHydrated()` exactly like the other ambient sections, with `SectionPlaceholder` holding space while in flight. Client-only is required here, not optional: "Today" is relative to the reader's clock, so rendering it during SSR would produce a hydration mismatch.
- Occurrence windows come from `todayRange` / `upcomingRange` + `getStandingEventOccurrences`, using the community's `timezone`. No new date math.
- External links reuse the existing `safeExternalUrl` allow-list treatment used by the city-data sections; every card is `target="_blank" rel="noreferrer noopener"`.
- Wiring: `today-home.tsx` gains one section; `board-content.tsx`'s `ScopedPostList` renders the Plans section when `view === "plans"` (including the empty-board case, so a community with no neighbor plans still shows real standing events).
- Failure and empty states stay silent — a curated-events outage must not affect the board.

## Verification

- Playwright screenshots at 390px and desktop for Edgewater, Lakeview, and Lincoln Park: Today and Plans.
- Confirm a Lakeview late-night series still shows under "Happening today" late in the evening, and that a paused/draft series never appears publicly.
- Recurrence tests, typecheck, and lint re-run.
