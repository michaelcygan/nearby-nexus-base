# Wave 7: NFC-ready links + launch hardening

## Goal
Prepare the app for physical NFC/QR deployment and publish it. The user programs their own chips and QR codes, so we only need to expose a clean, copyable neighborhood URL — visible to admins only — and fix the remaining SSR/client mismatch before launch.

## What we already know
- All six feature waves are in place: public boards, auth/profiles, posting, participation/messaging, moderation, and the neighborhood store.
- A sticker/scan should land on the public neighborhood home page (`/n/$slug`) — no redirect or tracking layer.
- The user physically programs their own NFC chips and generates their own QR codes; they only need the URL surfaced in the UI.
- There is a live hydration mismatch on post cards caused by timezone-sensitive date formatting (`formatDate` / `formatDateTime` in `src/features/neighborhoods/types.ts`) producing different server and client output.

## Work

### 1. Fix the timezone hydration mismatch
- Add a `timezone` column to `public.neighborhoods`, defaulting to `America/New_York` for the existing Pittsburgh neighborhoods.
- Update `formatDate` and `formatDateTime` to format against an explicit timezone so server and client render identical strings.
- Audit other date display sites (post detail, store listing, message timestamps, order history) and apply the same fixed timezone.

### 2. Admin-only NFC/QR link tool
Confirmed per your note: this is an admin surface, not public.
- New admin page: `/admin/access-points`, gated behind the existing moderator/admin role check.
- Lists every neighborhood with its canonical scan URL (e.g., `https://nearby-nexus-base.lovable.app/n/bloomfield`) and a one-click copy button.
- Includes a printable sticker card per neighborhood (neighborhood name + URL) so you can print labels before attaching chips.
- Link it from the account menu alongside the existing moderation and store admin links, visible only to admins.
- Nothing about NFC/QR appears on public neighborhood pages.

### 3. Launch hardening
- Verify every route has unique `head()` metadata (title, description, og:title, og:description) with self-referencing canonical and og:url.
- Final browser pass: console errors, network errors, mobile overflow, basic accessibility.
- Confirm the store remains in Stripe test mode with the test-mode banner visible.
- Run a security scan and resolve new findings.

### 4. Publish and handoff
- Publish to the default `.lovable.app` URL.
- Summarize the launch URL and the `/n/<slug>` URL pattern to program into your chips.

## Out of scope
- Custom QR/NFC generator, redirect service, or scan analytics (deferred).
- Custom domain setup unless you provide a domain.
- New feature modules beyond the existing six waves.