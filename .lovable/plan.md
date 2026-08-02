## What I checked

I crawled the running app (desktop 1280px) through `/`, `/edgewater`, `/lincoln-park`, `/lakeview`, every board tab (`today`, `plans`, `marketplace`, `help`, `places`), the scope lenses (`nearby&radius=3`, `city`), `/auth`, `/community-guidelines`, and a bogus slug, capturing console, page errors, HTTP failures and screenshots.

**Working correctly:** all community routes 200; masthead (`CHICAGO, ILLINOIS` → H1 → tagline → Post trigger); sticky tabs; quiet empty state on the board; Explore the board with real local counts (0/0/0/4 for Edgewater); Places tab grouped by category; Around {community} and From the city rendering live Chicago data; About disclosure; unknown slug returns a real 404 with `noindex`.

## Issues found

1. **Ambient sections pop in ~4.5s after paint, at the top of the page.** Weather, Around {community} and From the city are absent from the first render and appear together after the client-side server-function call resolves (measured: absent at 0–3s, present at 4.5s). Because the weather strip sits above everything, the whole page shifts down when it lands. No placeholder is reserved.
2. **A hydration mismatch error fires on the community page.** Reproduced once as a `pageerror` ("server rendered HTML didn't match the client") on `/edgewater`; root cause not yet identified — needs isolation before it is called fixed.
3. **Every board tab shares one title and description.** `/edgewater?view=plans`, `?view=marketplace`, `?view=help`, `?view=places` all render `Edgewater Today — Neighborhood Today` with the Today description. Only canonical/`og:url` vary by view.
4. **One unexplained 404 network response** during the crawl; not yet attributed to a request.
5. **Signed-in half of the experience is unverified.** Post creation, join/leave, threads, moderation and store flows were not exercised in this pass.

## Plan

**1. Fix the Today pop-in and shift**
- Reserve stable space for the weather strip and the two civic sections so nothing above the board moves when data lands: render a low-key skeleton line for weather and hold section slots while `communityTodayQuery` is pending, and only collapse when the query settles empty.
- Tighten the upstream budget so the wait is short: reduce per-provider timeouts, and cap the aggregate so one slow provider cannot hold the others.
- Keep the "silently absent on failure" rule intact — a settled-empty provider still renders nothing.

**2. Diagnose and fix the hydration mismatch**
- Reproduce deterministically with repeated loads, then bisect by section (weather timestamps via `Intl` with `timeZone`, session-dependent blocked-ids read, relative date text) until the mismatching node is identified.
- Fix at the source (hydration-safe formatting or gating the client-only read), not by suppressing the warning.

**3. Give each board view its own head metadata**
- In `src/routes/$slug.index.tsx`, derive per-view `title`, `description`, `og:title`, `og:description` from the active view (Today / Plans / Marketplace / Help / Places) alongside the existing canonical and `og:url`.
- Radius and scope variants stay non-canonical duplicates of their view, as today.

**4. Trace and resolve the 404 request**
- Re-run the crawl with full response logging to attribute the 404 (likely an asset or icon reference) and remove or correct the reference.

**5. Audit the signed-in experience and report**
- With a restored session, walk: create a plan → it appears on Today and Plans → join → message the author → report/block → admin moderation; plus a store listing checkout entry point and `/a/$code` NFC scan → community landing.
- Fix defects found in that pass that are presentation or wiring bugs; report anything that would change agreed product rules rather than changing it unilaterally.

**6. Re-verify**
- Repeat the desktop and 390px mobile crawl: zero console/page errors, no layout shift at the top of Today, distinct titles per tab, all routes 200/404 as intended.

### Technical notes
- Section slot handling is presentation-level in `today-home.tsx` plus the affected section components; no change to the aggregate contract in `data.server.ts` beyond timeout tuning.
- Per-view metadata is added in the existing `head()` of `src/routes/$slug.index.tsx`; `$slug.tsx` keeps the community-level defaults.
- No migrations; no changes to discovery scope rules, ranking, or the local-only governing rules.
