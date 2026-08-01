-- ============ enums ============
CREATE TYPE public.report_target AS ENUM ('post', 'place', 'profile', 'thread');
CREATE TYPE public.report_reason AS ENUM ('spam', 'unsafe', 'wrong_board', 'not_neighborly', 'other');
CREATE TYPE public.report_status AS ENUM ('open', 'dismissed', 'actioned');
CREATE TYPE public.moderation_action AS ENUM ('dismiss', 'hide', 'remove', 'restore');

-- ============ reports ============
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  target_type public.report_target NOT NULL,
  target_id uuid NOT NULL,
  reason public.report_reason NOT NULL,
  note text,
  status public.report_status NOT NULL DEFAULT 'open',
  resolution text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_status_idx ON public.reports (status, created_at DESC);
CREATE INDEX reports_target_idx ON public.reports (target_type, target_id);
CREATE UNIQUE INDEX reports_one_open_per_reporter_idx
  ON public.reports (reporter_id, target_type, target_id)
  WHERE status = 'open';

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can file their own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Members can read their own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Moderators can read all reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can resolve reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER reports_touch_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ blocks ============
CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
CREATE INDEX blocks_blocked_idx ON public.blocks (blocked_id);

GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can block others for themselves"
  ON public.blocks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id AND blocker_id <> blocked_id);

CREATE POLICY "Members can read their own blocks"
  ON public.blocks FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Members can remove their own blocks"
  ON public.blocks FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

CREATE OR REPLACE FUNCTION public.is_blocked_pair(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = _a AND b.blocked_id = _b)
       OR (b.blocker_id = _b AND b.blocked_id = _a)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) TO authenticated, service_role;

-- ============ moderation log ============
CREATE TABLE public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  action public.moderation_action NOT NULL,
  target_type public.report_target NOT NULL,
  target_id uuid NOT NULL,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_actions_created_idx ON public.moderation_actions (created_at DESC);

GRANT SELECT, INSERT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can read the moderation log"
  ON public.moderation_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can write the moderation log"
  ON public.moderation_actions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = actor_id
    AND (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'))
  );

-- ============ hiding content ============
ALTER TABLE public.posts ADD COLUMN hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.places ADD COLUMN hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.places ADD COLUMN removed boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Active posts are publicly readable" ON public.posts;
CREATE POLICY "Active posts are publicly readable"
  ON public.posts FOR SELECT TO anon, authenticated
  USING (status = 'active' AND hidden = false);

CREATE POLICY "Moderators can read all posts"
  ON public.posts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can moderate posts"
  ON public.posts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Directory places are publicly readable" ON public.places;
CREATE POLICY "Directory places are publicly readable"
  ON public.places FOR SELECT TO anon, authenticated
  USING (hidden = false AND removed = false);

CREATE POLICY "Moderators can read all places"
  ON public.places FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can moderate places"
  ON public.places FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- ============ role management by admins ============
CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can grant roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can revoke roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND user_id <> auth.uid());

GRANT INSERT, DELETE ON public.user_roles TO authenticated;

-- ============ blocks prevent new threads ============
CREATE OR REPLACE FUNCTION public.reject_blocked_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_blocked_pair(NEW.initiator_id, NEW.author_id) THEN
    RAISE EXCEPTION 'You cannot start a conversation with this neighbor.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reject_blocked_thread() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER threads_reject_blocked
  BEFORE INSERT ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_thread();

-- ============ daily rate limits ============
CREATE OR REPLACE FUNCTION public.enforce_daily_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
  used integer;
  cap integer := TG_ARGV[1]::integer;
BEGIN
  IF TG_ARGV[0] = 'posts' THEN
    actor := NEW.author_id;
    SELECT count(*) INTO used FROM public.posts
      WHERE author_id = actor AND created_at > now() - interval '24 hours';
  ELSIF TG_ARGV[0] = 'threads' THEN
    actor := NEW.initiator_id;
    SELECT count(*) INTO used FROM public.threads
      WHERE initiator_id = actor AND created_at > now() - interval '24 hours';
  ELSE
    actor := NEW.reporter_id;
    SELECT count(*) INTO used FROM public.reports
      WHERE reporter_id = actor AND created_at > now() - interval '24 hours';
  END IF;

  IF used >= cap THEN
    RAISE EXCEPTION 'Daily limit reached. Please try again tomorrow.';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_daily_limit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER posts_daily_limit BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_limit('posts', '10');
CREATE TRIGGER threads_daily_limit BEFORE INSERT ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_limit('threads', '20');
CREATE TRIGGER reports_daily_limit BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_limit('reports', '20');

-- ============ profile privacy ============
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, avatar_path) ON public.profiles TO anon;