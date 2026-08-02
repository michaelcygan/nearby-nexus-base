# Standing Neighborhood Events MVP — Remaining Waves

Wave 1 (data foundation + admin CRUD) and Wave 2 (public "Happening today" and Plans sections) are complete. Two waves remain to finish the MVP.

## Wave 3: Image Discovery

Goal: Let admins attach venue/promoter images to standing events without uploading files manually.

### Work
1. Add `image_url` and `image_verified_at` columns to `standing_events`.
2. Create a server function that fetches a venue `source_url`, parses Open Graph and Twitter Card meta tags, and returns candidate image URLs.
3. Add an admin UI action on each event row: “Discover image” → preview candidates → approve one → write `image_url` and `image_verified_at`.
4. Render `image_url` in `StandingEventCard` and `StandingEventsSection` when present, with a safe external link check.
5. Validate that discovered URLs are HTTPS and from the same host set as the source link.

## Wave 4: Proximity & Freshness

Goal: Make standing events useful outside the home community and keep the dataset from going stale.

### Work
1. Extend `standingEventsQuery` to support a `nearby` radius fallback in the Plans section (reuse existing `resolveCommunityScope` distance logic).
2. Add a `last_verified_at` column and a `verified_within_days` admin filter.
3. Add a small admin banner/stale indicator for events older than 90 days.
4. Implement a lightweight “Verify now” admin action that touches `last_verified_at`.
5. Production QA: run the full community board flow on mobile and desktop, check DST recurrence correctness, confirm external links open safely, and verify no console errors.

## Deliverables

- Image discovery tooling in admin.
- Standing events rendered with images where available.
- Nearby fallback for sparse communities.
- Staleness guardrails and final QA pass.