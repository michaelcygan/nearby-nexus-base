DROP VIEW IF EXISTS public.post_participation_counts;

ALTER TABLE public.posts
  ADD COLUMN going_count integer NOT NULL DEFAULT 0,
  ADD COLUMN volunteer_count integer NOT NULL DEFAULT 0,
  ADD COLUMN interested_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_participation_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_post uuid := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
  UPDATE public.posts p
  SET
    going_count = c.going,
    volunteer_count = c.volunteer,
    interested_count = c.interested
  FROM (
    SELECT
      count(*) FILTER (WHERE role = 'going') AS going,
      count(*) FILTER (WHERE role = 'volunteer') AS volunteer,
      count(*) FILTER (WHERE role = 'interested') AS interested
    FROM public.post_participants
    WHERE post_id = target_post
  ) c
  WHERE p.id = target_post;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_participation_counts() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER sync_participation_counts_after_change
  AFTER INSERT OR DELETE ON public.post_participants
  FOR EACH ROW EXECUTE FUNCTION public.sync_participation_counts();