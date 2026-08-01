Nothing is broken or half-finished from Waves 1–3 — the one open item is that I still can't sign in from my sandbox, so signed-in publishing is verified by code paths only. If you sign in once in the preview, I'll re-verify the live flow at the start of this wave.

Wave 4 is the participation layer: right now a post is a broadcast. After this, neighbors can actually join a plan, claim a volunteer slot, and talk to the author privately about a listing.

## Database (one migration)

- `post_participants` — one row per person per post: post reference, participant, role (`going` / `volunteer` / `interested`), optional note, created timestamp. Unique on (post, participant) so joining twice is impossible.
  - Read: the post's author sees everyone on their post; a participant sees their own row.
  - Write: a signed-in user may only create/remove their own row.
- `threads` — one private conversation per (post, other party), owned jointly by the post author and the initiator.
- `thread_messages` — body, sender, created timestamp; read/write only for the two thread participants.
- Counting: a `post_participation_counts` view (or security-definer function) returning going/volunteer counts per post, readable publicly, so boards can show "12 of 30 spots" without exposing who joined.
- Capacity guard: a validation trigger rejects a join when the plan's `capacity` or the volunteer ask's `slots` is already full, and when the post is not `active`.

## Server layer

- `src/features/participation/participation.functions.ts` — `joinPost`, `leavePost`, `listMyParticipation`, `listPostParticipants` (author only), all behind `requireSupabaseAuth` with the participant derived from the verified session.
- `src/features/messages/thread.functions.ts` — `startThread` (post + first message), `sendMessage`, `listMyThreads`, `getThread`. Author and initiator resolved server-side; no client-supplied identities.
- Public post fetchers extend to include participation counts so signed-out visitors still see spots remaining.

## UI

- Post detail page gains a participation block:
  - Plans: "I'm going" / "Can't make it" with spots remaining, plus the guest list for the author only.
  - Volunteer: "Claim a slot" with slots remaining.
  - Marketplace: "Message the seller" opening a private thread.
  - Signed-out visitors see an inline "Sign in to join" CTA — never a redirect, never a dead button.
- Post cards show a quiet "12 going" / "3 of 8 slots" line where relevant.
- `/messages` — a signed-in inbox listing threads with the post title, other neighbor, last message and unread marker; `/messages/$threadId` for the conversation itself.
- `/profile` gains "Things you joined", and the account menu gains a Messages link.
- Authors see who joined on their own post detail and in `/posts`.

## Verification

Typecheck, then a browser pass: join a plan and confirm the count moves on the board and the detail page, confirm joining past capacity is refused, confirm a second account can't read someone else's thread, confirm signed-out users see CTAs instead of broken controls, and confirm no console errors on mobile width.

## Technical notes

All identity comes from the validated bearer token inside the handler. Participation and thread reads are RLS-scoped so the public board can show aggregate counts while names stay private to the author. Capacity is enforced by a database trigger, not only in the client, so concurrent joins can't oversubscribe a plan. Moderation of participation and messages (reports, blocks) stays in Wave 5 as planned.
