## Wave 0 — Audit (verified against current code and database)

### Current posting surface
- `src/components/community/post-to-community.tsx` — dropdown of `composerActions` (plan / marketplace / volunteer) links to `/post/new?n=slug&type=…&returnTo=/slug`; signed-out users go to `/auth?redirect=/slug&action=<type>`.
- `src/routes/_authenticated/post.new.tsx` — `validateSearch` silently coerces a missing/invalid `type` to `plan`. Picks neighborhood from `n`, else first neighborhood.
- `src/routes/_authenticated/post.$postId.edit.tsx` — reuses `PostForm`; `toLocalInput()` converts timestamps in the **device** timezone (confirmed bug), and the neighborhood select is rendered as editable even though `protect_post_system_fields` resets `neighborhood_id` on update.
- `src/components/posts/post-form.tsx` — one form, full-width Neighborhood + "Kind of post" selects first, then conditional panels, ad-hoc `useState` errors (no React Hook Form yet, though `react-hook-form` + `@hookform/resolvers` are installed).
- `src/features/posts/schemas.ts` — `POST_TYPES = ["plan","marketplace","volunteer"]`, one `postInputSchema` with `superRefine` per type, `toPostRow()` nulls out non-matching fields — and today also nulls `location` for non-plan posts.
- `src/features/neighborhoods/types.ts` — `PostType`, `postTypeLabels` ("Plan" / "For sale" / "Help wanted"), `composerActions`, `boardViews` (`today` is unfiltered), `boardViewPostType`.
- `src/features/neighborhoods/data.server.ts` — `POST_COLUMNS` (no `place_id`), scoped feed filters by `type` when given, counts grouped by `type`.
- `src/features/posts/post.functions.ts` — `MY_POST_COLUMNS`, `createPost` / `updateMyPost` / `setMyPostStatus` / `deleteMyPost`, image-ownership assertion on `userId/` prefix.
- `src/routes/auth.tsx` — validates `action` against the same three types.

### Database facts
- `posts` holds all modes in one table; enum `post_type = plan | marketplace | volunteer`. No `place_id` column.
- Post triggers: `validate_post_fields` (per-type requirements only — a `bulletin` row passes with no extra fields), `protect_post_system_fields` (locks id/author/neighborhood/status/hidden/counts/created_at on update), `posts_daily_limit('posts',10)`, `touch_updated_at`.
- Note: `validate_post_fields` and `touch_updated_at` are each attached **twice** under different trigger names — harmless but worth cleaning up in Wave 1.
- `posts` RLS: public read of `status='active' AND hidden=false` in published communities; author read/update/delete; moderator read/update; insert requires `auth.uid() = author_id`. All type-agnostic, so `bulletin` needs no policy changes.
- `places` RLS: public read when `hidden=false AND removed=false` in a published community — safe to join for the composer picker.
- `post_participants` + `roleForPostType()` already map plan→going, volunteer→volunteer, else interested; `threads` / `thread_messages` exist with block rejection and a 20/day limit. No comments table exists.

### Compatibility conclusions
Adding an enum value is additive; existing rows are untouched. Nothing filters "all types" by enumerating them except `sanitizeTypes` in `queries.functions.ts` and `auth.tsx`, both of which get the new value. `bulletin` posts are excluded from Plans/Marketplace/Help automatically because those tabs filter by explicit type. Auth return survives because `/post/new` stays the canonical route and `returnTo` / `redirect` handling is unchanged (only `action` gains `bulletin` and becomes optional).

---

## Wave 1 — Universal post foundation
Migration: `ALTER TYPE post_type ADD VALUE 'bulletin'`; drop the duplicate `validate_post_fields_trigger` / `posts_touch` triggers. Then update `POST_TYPES`, `PostType`, `postTypeLabels` (Post / Plan / Marketplace / Help), `sanitizeTypes`, `auth.tsx` action validation, `emptyPostForm` default, `post.new` search default → `bulletin`, and card/detail rendering (no badge, no structured band, no participation action for bulletin). `toPostRow` stops clearing `location` for non-plan types.
**Acceptance:** a bulletin post publishes, shows on Today only, shows Reach out (not Going), reads anonymously; existing posts unaffected; build + lint pass.

## Wave 2 — Universal composer
New `src/components/posts/composer/` (post-composer.tsx, add-to-post-row.tsx, mode panels, mode pill) driven by React Hook Form + the existing zod resolver, consumed by both `post.new.tsx` and `post.$postId.edit.tsx`. Replace the board dropdown with a single "Start a post" launcher carrying `n`, active tab → mode, and `returnTo`. Header shows "Post to Edgewater · Public", compact Change control, no big selects. Headline + details first (auto-growing textarea, capped height), then "Add to your post" (Plan / Marketplace / Ask for help — mutually exclusive; Place / Photo — universal). Mode switches confirm before clearing mode-specific values; headline, details, photos, location persist. Sticky footer with `Post` / `Posting…`, footer hidden while composing on mobile, first-error focus.
**Acceptance:** write-before-classify, publish bulletin with no mode, one mode max, no duplicate type selectors, edit flow intact, iPhone viewport fits.

## Wave 3 — Place picker, location safety, timezone
Migration: `place_id uuid null references public.places(id) on delete set null` + index. Add `place_id` to `POST_COLUMNS` / `MY_POST_COLUMNS` with a safe join (`places:place_id(id, name, category, address)`) filtered to visible places; add to schema, `toPostRow`, `PostSummary`. Build reusable `PlaceCombobox` on the existing Command + Popover over current-neighborhood places (no external geocoder, no map), with custom location / intersection / online / decide later fallbacks. Exact-address heuristic warning on Marketplace + Help (warn, never delete). One tested `src/lib/community-time.ts` for neighborhood-timezone conversion used by create **and** edit; make neighborhood read-only on edit.
**Acceptance:** venue selection fills address and links to the Place page; place deletion doesn't delete posts; Plan times round-trip across DST and differing device timezones.

## Wave 4 — Unified responses and Reach out
Normalize action labels (Going / Interested / I can help / Comment), reuse existing `post_participants` and post-linked threads, hide Reach out on your own post (show Manage post), dedupe repeated Reach out taps to one thread, respect blocks, preserve auth return to the post. Shared post primitives across card and detail; structured info rendered as one compact band.

## Wave 5 — Public comments
Migration: `public.post_comments` (id, post_id, author_id, body ≤1000, hidden, removed, created_at, updated_at) with GRANTs, RLS (public read of visible comments on visible posts; author insert/update/delete own; moderator update), touch trigger, and a `comments` daily limit via the existing `enforce_daily_limit` pattern. Server functions + queries, flat chronological list, compact composer, "Sign in to comment" with return path, owner/moderator menus, report integration, block filtering.

## Wave 6 — Drafts, upload lifecycle, accessibility, QA
sessionStorage draft keyed to user + neighborhood + new-post, restore/discard prompt, unsaved-change confirmation, duplicate-submit guard, orphaned-upload cleanup, keyboard/screen-reader and reduced-motion audit, iOS safe-area checks, vitest coverage for timezone conversion and per-mode validation, regression pass on moderation/messages/participation. Reuse any existing analytics only.

---

## Risks and rollback
- Enum values cannot be dropped in Postgres; rollback means reverting UI to hide `bulletin`, not a schema revert. `place_id` and `post_comments` are individually droppable.
- Generated Supabase types are regenerated after each approved migration, so type-dependent code lands in the wave after the migration.
- `protect_post_system_fields` silently reverts protected fields — Wave 3 makes that visible in the edit UI rather than fighting it.
- The auth-intent contract (`redirect`, `action`, `returnTo`) is treated as fixed; `action` only widens.

## Test plan
Per wave: production build, `tsgo` typecheck, lint, vitest; manual pass at 390px and desktop covering create/edit for all four modes, anonymous read, moderation hide, block behavior, and Reach out dedupe.
