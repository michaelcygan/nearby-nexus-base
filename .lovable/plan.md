## Wave 3 — Post creation

Signed-in neighbors can publish Plans, Marketplace listings and Volunteer asks to a neighborhood board, with compressed photos. Directory listings stay admin-only for now (you'll sell vetted listings later).

### Database (one migration)
- `posts`: add author write access — INSERT policy for `authenticated` where `author_id = auth.uid()`, UPDATE/DELETE policies for the author on their own rows, and grants for `authenticated`. Make `author_id` NOT NULL going forward for new rows via trigger default (`auth.uid()`), keeping seeded rows intact.
- Add owner-side SELECT policy so authors can read their own non-active (completed/removed) posts — otherwise their own edits/manage views come back empty.
- Validation trigger per type: plans require `starts_at`; marketplace requires either `is_free` or `price_cents`; volunteer requires `needed_by` or `slots`. Enforced server-side too.
- `places`: INSERT/UPDATE/DELETE policies restricted to `has_role(auth.uid(), 'admin')`.
- New private storage bucket `post-images` with policies: authenticated users write only inside their own `{user_id}/…` folder; reads via signed URLs.

### Photos (kept cheap)
- Compression happens in the browser before upload: canvas resize to max 1600px on the long edge, JPEG quality ~0.72, hard cap of ~400KB per image and 4 images per post. Files above the cap after compression are rejected with a clear message.
- Only compressed derivatives are stored — no originals — so storage and egress stay small. Detail pages request signed URLs at a display size and lazy-load them.

### Server layer
- `src/features/posts/schemas.ts` — Zod schemas per post type (shared base + type-specific fields), reused by form and server.
- `src/features/posts/post.functions.ts` — `createPost`, `updateMyPost`, `deleteMyPost`, `listMyPosts`, `setPostImagePaths`, each with `requireSupabaseAuth`; `author_id` always derived from the verified session, never from request data.
- `src/features/posts/data.server.ts` — signed-URL helper for image paths; extend neighborhood fetchers to return image URLs on cards and detail pages.
- `src/features/directory/place.functions.ts` — admin-gated `createPlace` / `updatePlace` / `deletePlace` that verify the admin role through the user's own client before writing.

### UI
- `src/components/posts/post-form.tsx` — one shared form; a type switch reveals only that module's fields (Plan: date/time, location, capacity; Marketplace: price or free, condition; Volunteer: needed-by, slots). Includes the image dropzone with compression progress.
- New routes: `/_authenticated/n/$slug/new` (type chosen via search param, so `?type=plan` deep-links from a board), `/_authenticated/posts` (my posts: edit, mark completed, delete), `/_authenticated/posts/$postId/edit`.
- Boards gain a "Post to this board" action; signed-out visitors see an inline "Sign in to post" CTA instead of a redirect.
- Admin-only Directory management at `/_authenticated/admin/directory` (add/edit/remove places), hidden for non-admins.
- Post cards and detail pages render the first photo with the rest in a simple gallery.

### Verification
Typecheck, then a browser pass: publish one post of each type, confirm it appears on the right tab and detail page, confirm image compression stays under the cap, confirm a non-admin cannot reach directory management, and confirm signed-out users see the CTA rather than a broken form.

### Technical notes
Ownership is always taken from the validated bearer token in the handler; client-supplied author fields are ignored. Route protection uses the existing `_authenticated` gate. Admin checks run against the user's RLS-scoped client via `has_role`, never the service-role client.
