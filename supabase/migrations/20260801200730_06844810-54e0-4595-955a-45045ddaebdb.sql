-- Posts: authors own their rows
ALTER TABLE public.posts ALTER COLUMN author_id SET DEFAULT auth.uid();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

CREATE POLICY "Members can create their own posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can read their own posts"
ON public.posts FOR SELECT TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Authors can update their own posts"
ON public.posts FOR UPDATE TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own posts"
ON public.posts FOR DELETE TO authenticated
USING (auth.uid() = author_id);

-- Per-type validation (trigger, not CHECK, so rules can evolve with time-based data)
CREATE OR REPLACE FUNCTION public.validate_post_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'plan' AND NEW.starts_at IS NULL THEN
    RAISE EXCEPTION 'Plans need a start date and time.';
  END IF;

  IF NEW.type = 'marketplace' AND COALESCE(NEW.is_free, false) = false AND NEW.price_cents IS NULL THEN
    RAISE EXCEPTION 'Marketplace listings need a price or must be marked free.';
  END IF;

  IF NEW.type = 'volunteer' AND NEW.needed_by IS NULL AND NEW.slots IS NULL THEN
    RAISE EXCEPTION 'Volunteer asks need a needed-by date or a number of helpers.';
  END IF;

  IF NEW.price_cents IS NOT NULL AND NEW.price_cents < 0 THEN
    RAISE EXCEPTION 'Price cannot be negative.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_post_fields() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER validate_post_fields_trigger
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.validate_post_fields();

CREATE TRIGGER posts_touch_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Directory places: admin-managed only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.places TO authenticated;
GRANT ALL ON public.places TO service_role;

CREATE POLICY "Admins can create places"
ON public.places FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update places"
ON public.places FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete places"
ON public.places FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER places_touch_updated_at
BEFORE UPDATE ON public.places
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();