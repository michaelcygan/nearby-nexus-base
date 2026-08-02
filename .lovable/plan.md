## Goal

15 active standing events across 12 venues currently render without a thumbnail because the venue's linked page exposed no Open Graph image. Find a real, stable https image for each and attach it as an approved image.

## The 12 venues

Clover Sports and Leisure (3 events), Sidetrack (3), Duffy's Tavern and Grille, Fireside Chicago, Gaslight Bar & Grille, Good Times Brewery, Gracie O'Malley's, Murphy's Bleachers, Parlay Lincoln Park, Replay Andersonville, The River.

## Research method (per venue, in priority order)

1. Re-scrape the venue's **home page** and events/calendar index, not just the deep event URL the seed points at. Deep event pages on Squarespace/Tock/WordPress often skip og:image while the site root has one.
2. Look for a `<link rel="apple-touch-icon">`, hero `<img>`, or logo asset on the venue site when no meta image exists.
3. Check the venue's own listing pages (Google Business, Yelp, Tock, Instagram profile image) for a venue-owned photo.
4. Reject anything that isn't https, isn't clearly the venue's own imagery, or is a generic stock/placeholder graphic.

Each accepted image gets an `image_attribution` string naming the source host, so the provenance stays auditable.

## What gets written

For every venue where research succeeds, a data update sets `image_url`, `image_attribution`, `image_verified_at` (today, since I reviewed each image by eye), and `verified_by` stays null (no admin user performed it). Events at the same venue share the venue image where appropriate — Sidetrack's three nights and Clover's three nights each get one venue image.

Images are hotlinked to the venue's host, matching how the already-seeded 15 events work.

## Verification

- Confirm every written URL returns a 200 and an `image/*` content type before it is stored.
- Re-check that `standing_event` triggers accept each URL (https-only constraint).
- Screenshot Edgewater, Lakeview, and Lincoln Park Today + Plans on mobile to confirm thumbnails render and rows without an image still lay out cleanly.
- Report back the list of venues where no acceptable image existed, rather than filling them with something generic.

## Technical notes

No schema change and no code change is expected — this is a research pass plus a data update to `standing_events`. If a venue image only exists behind a page whose HTML the current discovery regex can't reach (e.g. image inside JSON-LD), I'll note it rather than broaden the parser in this pass.
