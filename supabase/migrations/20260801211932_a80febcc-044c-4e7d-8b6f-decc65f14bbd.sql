-- Participation roles
CREATE TYPE public.participation_role AS ENUM ('going', 'volunteer', 'interested');

CREATE TABLE public.post_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.participation_role NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX post_participants_post_idx ON public.post_participants (post_id);
CREATE INDEX post_participants_user_idx ON public.post_participants (user_id);

GRANT SELECT, INSERT, DELETE ON public.post_participants TO authenticated;
GRANT ALL ON public.post_participants TO service_role;

ALTER TABLE public.post_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their own participation"
  ON public.post_participants FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authors can read participants on their posts"
  ON public.post_participants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_participants.post_id AND p.author_id = auth.uid()
  ));

CREATE POLICY "Members can join posts for themselves"
  ON public.post_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave posts they joined"
  ON public.post_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Capacity + status guard
CREATE OR REPLACE FUNCTION public.validate_participation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.posts;
  taken integer;
  allowed integer;
BEGIN
  SELECT * INTO target FROM public.posts WHERE id = NEW.post_id;

  IF target.id IS NULL THEN
    RAISE EXCEPTION 'That post no longer exists.';
  END IF;

  IF target.status <> 'active' THEN
    RAISE EXCEPTION 'This post is no longer open to sign-ups.';
  END IF;

  IF target.author_id = NEW.user_id THEN
    RAISE EXCEPTION 'You are the author of this post.';
  END IF;

  IF NEW.role = 'going' THEN
    allowed := target.capacity;
  ELSIF NEW.role = 'volunteer' THEN
    allowed := target.slots;
  ELSE
    allowed := NULL;
  END IF;

  IF allowed IS NOT NULL THEN
    SELECT count(*) INTO taken
    FROM public.post_participants
    WHERE post_id = NEW.post_id AND role = NEW.role;

    IF taken >= allowed THEN
      RAISE EXCEPTION 'This post is already full.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_participation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER validate_participation_before_insert
  BEFORE INSERT ON public.post_participants
  FOR EACH ROW EXECUTE FUNCTION public.validate_participation();

-- Public aggregate counts (no identities exposed)
CREATE VIEW public.post_participation_counts
WITH (security_invoker = false) AS
  SELECT
    post_id,
    count(*) FILTER (WHERE role = 'going') AS going_count,
    count(*) FILTER (WHERE role = 'volunteer') AS volunteer_count,
    count(*) FILTER (WHERE role = 'interested') AS interested_count
  FROM public.post_participants
  GROUP BY post_id;

GRANT SELECT ON public.post_participation_counts TO anon, authenticated, service_role;

-- Private threads
CREATE TABLE public.threads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  initiator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_last_read_at timestamp with time zone,
  initiator_last_read_at timestamp with time zone,
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (post_id, initiator_id)
);

CREATE INDEX threads_author_idx ON public.threads (author_id);
CREATE INDEX threads_initiator_idx ON public.threads (initiator_id);

GRANT SELECT, INSERT, UPDATE ON public.threads TO authenticated;
GRANT ALL ON public.threads TO service_role;

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread members can read their threads"
  ON public.threads FOR SELECT TO authenticated
  USING (auth.uid() = author_id OR auth.uid() = initiator_id);

CREATE POLICY "Members can start a thread on someone else's post"
  ON public.threads FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = initiator_id
    AND auth.uid() <> author_id
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = threads.post_id AND p.author_id = threads.author_id
    )
  );

CREATE POLICY "Thread members can update their thread"
  ON public.threads FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR auth.uid() = initiator_id)
  WITH CHECK (auth.uid() = author_id OR auth.uid() = initiator_id);

CREATE TRIGGER threads_touch_updated_at
  BEFORE UPDATE ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.is_thread_member(_thread_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = _thread_id AND (t.author_id = _user_id OR t.initiator_id = _user_id)
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_thread_member(uuid, uuid) TO authenticated;

CREATE TABLE public.thread_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX thread_messages_thread_idx ON public.thread_messages (thread_id, created_at);

GRANT SELECT, INSERT ON public.thread_messages TO authenticated;
GRANT ALL ON public.thread_messages TO service_role;

ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread members can read messages"
  ON public.thread_messages FOR SELECT TO authenticated
  USING (public.is_thread_member(thread_id, auth.uid()));

CREATE POLICY "Thread members can send messages"
  ON public.thread_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.is_thread_member(thread_id, auth.uid()));