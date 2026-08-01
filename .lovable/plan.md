## Wave 2 — Auth + lightweight profiles

Verified current state: the project has no auth routes, no protected route gate, no `profiles`/`user_roles`/`saved_neighborhoods` tables, no storage buckets, and `src/start.ts` registers no client middleware for attaching a signed-in token. Everything below is new.

### 1. Database

One migration, with grants + RLS for every table:

- `profiles` — `id` (matches the signed-in user), `display_name`, `about`, `avatar_path`, `home_neighborhood_id` (→ `neighborhoods`), timestamps + updated-at trigger. Readable by everyone (public neighbor pages), writable only by the owner. A signup trigger creates a row automatically with a display name derived from Google metadata or the email local-part.
- `user_roles` + `app_role` enum (`admin`, `moderator`, `member`) and a `has_role()` security-definer function — roles live in their own table, never on profiles. Needed now so Waves 3–5 can build on it.
- `saved_neighborhoods` — owner + neighborhood, unique per pair, owner-only read/write.

### 2. Auth configuration

- Enable Google sign-in through the managed broker (configured the same turn the button ships, otherwise the first sign-in errors).
- Email/password stays on. No anonymous sign-ups, no auto-confirm — signup shows a "check your email" state rather than pretending the user is logged in.
- Avatars bucket in storage: public read, owner-scoped writes under a per-user folder.

### 3. Routes

- `/auth` — public. Email/password sign-in and sign-up plus "Continue with Google", tabs between the two modes, zod-validated fields, honest error and confirm-your-email states. Redirects a signed-in visitor away, and preserves a `redirect` target so a click on a protected link returns there.
- `/reset-password` — public. Requesting a reset link lives on `/auth`; this page sets the new password.
- `src/routes/_authenticated/route.tsx` — the protected gate (client-only session check, redirect to `/auth`). Public neighborhood pages stay untouched and keep server rendering.
- `/_authenticated/profile` — edit display name, about, home neighborhood, avatar upload with alt text and client-side resizing; shows the saved-neighborhoods list with remove buttons.
- `/_authenticated/activity` — a stub-free placeholder is not acceptable, so this page shows what exists today: your saved neighborhoods and your profile completeness. Post/thread activity arrives with Waves 3–4.
- `/u/$profileId` — public neighbor page: display name, avatar, about, home neighborhood. Own metadata, error and not-found states.

### 4. Session-aware chrome

- Header shows an account menu (avatar + display name, links to profile and activity, sign out) when signed in, and a "Sign in" link when not — driven by the session, so a successful sign-in visibly changes the header.
- Sign-out cancels in-flight queries, clears the cache, signs out, then replaces history with `/auth`.
- A single `onAuthStateChange` subscriber in the root route invalidates the router and query cache on identity changes only.
- Neighborhood pages gain a "Save this neighborhood" button that prompts sign-in when anonymous rather than failing silently.

### 5. Verification before I call it done

Driving the real app in a browser: anonymous visit to `/_authenticated/profile` redirects to `/auth`; sign-up shows the confirm-email state; a signed-in session can edit its profile and see the change persist after reload; avatar upload lands in storage and renders on `/u/$profileId`; a second account cannot edit the first one's profile; saving a neighborhood persists; sign-out returns to `/auth` and Back does not restore the protected page. Plus typecheck and a clean console.

### Technical notes

- Profile reads/writes go through `createServerFn`; owner-scoped writes use the authenticated middleware, and `src/start.ts` gains the bearer-token client middleware appended to its existing middleware list.
- Public profile reads use the publishable-key server client already in place for neighborhood data, behind a narrow public policy.
- Google's redirect target is the public app origin; the intended destination is stored separately and applied only once a session is confirmed.
