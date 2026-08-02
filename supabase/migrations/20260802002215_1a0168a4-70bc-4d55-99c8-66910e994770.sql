-- 1. Community shape ------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.location_type AS ENUM ('neighborhood', 'town', 'village', 'city');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.community_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.neighborhoods
  ADD COLUMN IF NOT EXISTS location_type public.location_type NOT NULL DEFAULT 'neighborhood',
  ADD COLUMN IF NOT EXISTS state_code text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Chicago',
  ADD COLUMN IF NOT EXISTS status public.community_status NOT NULL DEFAULT 'draft';

CREATE OR REPLACE FUNCTION public.is_published_community(_neighborhood_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.neighborhoods n
    WHERE n.id = _neighborhood_id AND n.status = 'published'
  )
$$;

REVOKE ALL ON FUNCTION public.is_published_community(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_published_community(uuid) TO authenticated, service_role;

-- Public visibility now depends on publication state.
DROP POLICY IF EXISTS "Neighborhoods are publicly readable" ON public.neighborhoods;
CREATE POLICY "Published communities are publicly readable"
  ON public.neighborhoods FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Admins can read all communities"
  ON public.neighborhoods FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS "Active posts are publicly readable" ON public.posts;
CREATE POLICY "Active posts in published communities are publicly readable"
  ON public.posts FOR SELECT TO anon, authenticated
  USING (
    status = 'active'
    AND hidden = false
    AND public.is_published_community(neighborhood_id)
  );

DROP POLICY IF EXISTS "Directory places are publicly readable" ON public.places;
CREATE POLICY "Places in published communities are publicly readable"
  ON public.places FOR SELECT TO anon, authenticated
  USING (
    hidden = false
    AND removed = false
    AND public.is_published_community(neighborhood_id)
  );

-- 2. System-managed post fields -------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_post_system_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privileged boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    privileged := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator');
  ELSE
    -- No JWT: trusted server-side / trigger context.
    privileged := true;
  END IF;

  IF privileged THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.author_id := OLD.author_id;
  NEW.neighborhood_id := OLD.neighborhood_id;
  NEW.status := OLD.status;
  NEW.hidden := OLD.hidden;
  NEW.going_count := OLD.going_count;
  NEW.volunteer_count := OLD.volunteer_count;
  NEW.interested_count := OLD.interested_count;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_post_system_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_post_system_fields ON public.posts;
CREATE TRIGGER protect_post_system_fields
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.protect_post_system_fields();

-- Re-assert the triggers this project relies on (none were registered).
DROP TRIGGER IF EXISTS validate_post_fields ON public.posts;
CREATE TRIGGER validate_post_fields
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.validate_post_fields();

DROP TRIGGER IF EXISTS touch_neighborhoods_updated_at ON public.neighborhoods;
CREATE TRIGGER touch_neighborhoods_updated_at
  BEFORE UPDATE ON public.neighborhoods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. NFC / QR access points ----------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.access_point_status AS ENUM ('active', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.access_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  neighborhood_id uuid NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
  label text NOT NULL,
  status public.access_point_status NOT NULL DEFAULT 'active',
  destination_path text NOT NULL,
  scan_count integer NOT NULL DEFAULT 0,
  last_scanned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.access_points TO authenticated;
GRANT ALL ON public.access_points TO service_role;

ALTER TABLE public.access_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read access points" ON public.access_points;
CREATE POLICY "Admins can read access points"
  ON public.access_points FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can create access points" ON public.access_points;
CREATE POLICY "Admins can create access points"
  ON public.access_points FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update access points" ON public.access_points;
CREATE POLICY "Admins can update access points"
  ON public.access_points FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS touch_access_points_updated_at ON public.access_points;
CREATE TRIGGER touch_access_points_updated_at
  BEFORE UPDATE ON public.access_points
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Anonymous aggregate scan counter. Records nothing about the visitor.
CREATE OR REPLACE FUNCTION public.record_access_point_scan(_code text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  destination text;
BEGIN
  UPDATE public.access_points
  SET scan_count = scan_count + 1,
      last_scanned_at = now()
  WHERE code = _code AND status = 'active'
  RETURNING destination_path INTO destination;

  RETURN destination;
END;
$$;

REVOKE ALL ON FUNCTION public.record_access_point_scan(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_access_point_scan(text) TO anon, authenticated, service_role;

-- 4. Seed Edgewater (idempotent) -----------------------------------------
INSERT INTO public.neighborhoods (slug, name, city, state_code, location_type, timezone, status, tagline, about)
VALUES (
  'edgewater',
  'Edgewater',
  'Chicago',
  'IL',
  'neighborhood',
  'America/Chicago',
  'published',
  'What''s happening, needed, offered, and shared in Edgewater today.',
  'Edgewater is a lakefront community on Chicago''s North Side, stretching from Foster Avenue to Devon Avenue between Ravenswood Avenue and Lake Michigan.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  state_code = EXCLUDED.state_code,
  location_type = EXCLUDED.location_type,
  timezone = EXCLUDED.timezone,
  status = EXCLUDED.status,
  tagline = EXCLUDED.tagline,
  about = EXCLUDED.about;

-- Demo communities stay in the database but leave public view. Explicit slugs only.
UPDATE public.neighborhoods
SET status = 'draft'
WHERE slug IN ('lawrenceville', 'bloomfield', 'polish-hill');

-- Pittsburgh demo communities keep their US Eastern timezone.
UPDATE public.neighborhoods
SET timezone = 'America/New_York', state_code = 'PA'
WHERE slug IN ('lawrenceville', 'bloomfield', 'polish-hill');

INSERT INTO public.places (neighborhood_id, name, category, address, phone, website, description)
SELECT n.id, v.name, v.category, v.address, v.phone, v.website, v.description
FROM public.neighborhoods n
CROSS JOIN (VALUES
  (
    'Edgewater Branch, Chicago Public Library',
    'Library',
    '6000 N. Broadway, Chicago, IL 60660',
    '(312) 742-1945',
    'https://www.chipublib.org/locations/28/',
    'Public library offering books, events, study space, technology assistance, and neighborhood resources.'
  ),
  (
    'Broadway Armory Park',
    'Recreation',
    '5917 N. Broadway, Chicago, IL 60660',
    NULL,
    'https://www.chicagoparkdistrict.com/parks-facilities/broadway-armory-park',
    'Chicago Park District indoor recreation facility with gymnasiums, programs, community rooms, and activities for multiple ages.'
  ),
  (
    'Berger Park',
    'Park',
    '6205 N. Sheridan Rd., Chicago, IL 60660',
    '(773) 761-0376',
    'https://www.chicagoparkdistrict.com/parks-facilities/berger-albert-park',
    'Lakefront neighborhood park and cultural center with community programs and gathering spaces.'
  ),
  (
    'Edgewater Chamber of Commerce',
    'Community resource',
    '1210 W. Rosedale Ave., Chicago, IL 60660',
    NULL,
    'https://www.edgewater.org/',
    'Local business and community organization connecting Edgewater businesses, events, and neighborhood resources.'
  )
) AS v(name, category, address, phone, website, description)
WHERE n.slug = 'edgewater'
  AND NOT EXISTS (
    SELECT 1 FROM public.places p
    WHERE p.neighborhood_id = n.id AND p.name = v.name
  );

INSERT INTO public.access_points (code, neighborhood_id, label, status, destination_path)
SELECT 'EW-' || encode(gen_random_bytes(6), 'hex'), n.id, 'Edgewater lamppost tags (batch 1)', 'active', '/edgewater'
FROM public.neighborhoods n
WHERE n.slug = 'edgewater'
  AND NOT EXISTS (SELECT 1 FROM public.access_points ap WHERE ap.neighborhood_id = n.id);