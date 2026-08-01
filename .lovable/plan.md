## Where things stand

Waves 1–4 are complete and verified on public routes. No moderation code exists yet (no reports, blocks, or moderation surfaces anywhere in the codebase), so Wave 5 is a clean build.

Two carry-over items to handle first:

1. **Live signed-in verification** — my sandbox still has no session. Sign in once in the preview and I'll re-verify publishing, joining, and messaging end to end at the start of this wave.
2. **Public profile exposure (security scan, error level)** — `profiles` is currently readable by anyone on the internet, including bios and home neighborhood. Since neighbor names must show on public boards, the fix is to expose only the fields boards actually need to visitors, and keep bio + home neighborhood for signed-in members.

## Wave 5 — Moderation and safety

The goal: the board stays civil without you reading every post. Members flag problems, blocked people disappear from each other's view, and admins/moderators get one screen to act from.

### Reporting
- Members can report a post, a directory place, a profile, or a message thread, with a reason (spam, unsafe, wrong board, not neighborly, other) and an optional note.
- Reporters see a confirmation and their own report history; they cannot see other people's reports.
- A "Report" action appears on post detail pages, place pages, public neighbor pages, and inside message threads.

### Blocking
- A member can block another member. After that: their posts drop out of the blocker's feeds, existing threads between them are hidden, and neither can start a new thread with the other.
- Blocks are private — the blocked person is never told.
- Manage blocks from a section on the profile page.

### Author + moderator actions
- Authors already delete their own posts; add "hide" so they can pull something without losing it.
- Moderators and admins get `/admin/moderation`: open reports queue with the reported content inline, and actions to dismiss, hide the content, or remove it. Every action is written to an audit log with who did it and why.
- Removed content shows a plain "This post was removed by a moderator" state rather than a broken page.
- Admins can grant or revoke the moderator role from `/admin/members`.

### Rate limits and guardrails
- Cap posts and thread starts per member per day, enforced in the database so it can't be bypassed from the browser.
- Cap reports per member per day so reporting can't be used as harassment.
- Community guidelines page gets links from the report dialogs so the rules are visible at the moment they matter.

## Technical notes

- **New tables**: `reports` (target type + id, reporter, reason, note, status, resolution), `blocks` (blocker, blocked, unique pair), `moderation_actions` (audit log: actor, action, target, reason).
- **RLS**: reporters read only their own reports; moderators/admins read all via `has_role`. Blocks readable only by the blocker. Audit log readable by moderators/admins, insertable only through server functions.
- **Status handling**: `posts.status` already has `removed`; add `hidden` to `post_status` and a `status` column to `places` so removal/hiding is uniform. Public SELECT policies filter to `active`; authors and moderators keep owner/role-scoped read paths so hidden rows stay reachable from `/posts` and the moderation queue.
- **Block filtering** happens server-side in the existing feed and thread fetchers via a security-definer helper, so blocked content never reaches the browser.
- **Rate limits** are enforced by triggers on `posts`, `threads`, and `reports` counting the actor's rows in the last 24 hours.
- **Profiles fix**: narrow the public SELECT policy to display name + avatar only (via a restricted public view or column-limited policy), and serve full profile detail through an authenticated server function. Public boards keep showing names; bios and home neighborhood become sign-in-only.
- **Server layer**: `src/features/moderation/` with `report.functions.ts`, `block.functions.ts`, `moderation.functions.ts` (role-gated), and query options; all mutations go through `createServerFn` with `requireSupabaseAuth`.
- The two remaining `SECURITY DEFINER` scan warnings are the intended `has_role` / `is_thread_member` RLS-helper pattern and stay as-is; new helpers follow the same shape with `EXECUTE` revoked from `anon`.

### Verification
Typecheck, then browser checks: report dialog opens and submits, removed post shows its removed state, moderation queue is unreachable without the role, public board still shows author names while a signed-out visit to `/u/{id}` no longer exposes bio. Signed-in paths get live verification if a preview session is available.
