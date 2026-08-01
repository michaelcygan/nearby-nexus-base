CREATE TYPE public.post_type AS ENUM ('plan', 'marketplace', 'volunteer');
CREATE TYPE public.post_status AS ENUM ('active', 'completed', 'expired', 'removed');

CREATE TABLE public.neighborhoods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  city text NOT NULL,
  tagline text,
  about text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.neighborhoods TO anon;
GRANT SELECT ON public.neighborhoods TO authenticated;
GRANT ALL ON public.neighborhoods TO service_role;
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Neighborhoods are publicly readable" ON public.neighborhoods FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  neighborhood_id uuid NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
  author_id uuid,
  type public.post_type NOT NULL,
  status public.post_status NOT NULL DEFAULT 'active',
  title text NOT NULL,
  body text NOT NULL,
  expires_at timestamptz,
  image_paths text[] NOT NULL DEFAULT '{}',
  starts_at timestamptz,
  location text,
  capacity integer,
  price_cents integer,
  is_free boolean,
  condition text,
  needed_by timestamptz,
  slots integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_title_len CHECK (char_length(title) BETWEEN 3 AND 140),
  CONSTRAINT posts_body_len CHECK (char_length(body) BETWEEN 1 AND 4000),
  CONSTRAINT posts_capacity_positive CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT posts_slots_positive CHECK (slots IS NULL OR slots > 0),
  CONSTRAINT posts_price_nonneg CHECK (price_cents IS NULL OR price_cents >= 0),
  CONSTRAINT posts_plan_fields CHECK (type = 'plan' OR (starts_at IS NULL AND capacity IS NULL)),
  CONSTRAINT posts_marketplace_fields CHECK (type = 'marketplace' OR (price_cents IS NULL AND is_free IS NULL AND condition IS NULL)),
  CONSTRAINT posts_volunteer_fields CHECK (type = 'volunteer' OR (needed_by IS NULL AND slots IS NULL))
);

CREATE INDEX posts_neighborhood_type_idx ON public.posts (neighborhood_id, type, status, created_at DESC);

GRANT SELECT ON public.posts TO anon;
GRANT SELECT ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active posts are publicly readable" ON public.posts FOR SELECT TO anon, authenticated USING (status = 'active');

CREATE TABLE public.places (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  neighborhood_id uuid NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  address text,
  description text,
  website text,
  phone text,
  hours text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX places_neighborhood_idx ON public.places (neighborhood_id, category, name);

GRANT SELECT ON public.places TO anon;
GRANT SELECT ON public.places TO authenticated;
GRANT ALL ON public.places TO service_role;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Directory places are publicly readable" ON public.places FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER neighborhoods_touch BEFORE UPDATE ON public.neighborhoods FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER posts_touch BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER places_touch BEFORE UPDATE ON public.places FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.neighborhoods (slug, name, city, tagline, about) VALUES
('lawrenceville', 'Lawrenceville', 'Pittsburgh', 'Butler Street, the river, and everything between.', 'A long, narrow neighborhood stretched along the Allegheny. Old rowhouses, new storefronts, and a stubborn habit of doing things together.'),
('bloomfield', 'Bloomfield', 'Pittsburgh', 'Pittsburgh''s Little Italy, still cooking.', 'Liberty Avenue runs the length of it: bakeries, butchers, the Saturday market, and porches close enough to talk across.'),
('polish-hill', 'Polish Hill', 'Pittsburgh', 'Steep streets, big church, small favors.', 'Tucked between the strip and the hill, with the Immaculate Heart of Mary dome over everything. Everyone knows whose steps are whose.');

INSERT INTO public.posts (neighborhood_id, type, title, body, starts_at, location, capacity)
SELECT n.id, 'plan', v.title, v.body, v.starts_at, v.location, v.capacity
FROM public.neighborhoods n
JOIN (VALUES
  ('lawrenceville', 'Allegheny riverfront cleanup', 'Bags and gloves provided. We start at the boat ramp and work upstream for two hours, then get coffee. Kids welcome if they stay off the rocks.', now() + interval '5 days', '40th Street boat ramp', 30),
  ('lawrenceville', 'Tuesday morning run club', 'Easy five miles, nobody gets dropped. Meet by the fountain, we leave at 6:30 sharp because of work.', now() + interval '2 days', 'Arsenal Park fountain', 20),
  ('lawrenceville', 'Porch record swap', 'Bring ten records you are done with, leave with ten you are not. Turntable on the porch, no jazz snobbery permitted.', now() + interval '9 days', '52nd and Hatfield, blue porch', 25),
  ('bloomfield', 'Liberty Ave stoop sale coordination', 'Trying to get everyone on the same Saturday so shoppers walk the whole strip. Come tell us which block you are on.', now() + interval '4 days', 'Bloomfield Bridge Tavern back room', 40),
  ('bloomfield', 'Community garden bed build', 'Six raised beds, one afternoon. Drills welcome, so is anyone who can carry lumber or make lemonade.', now() + interval '7 days', 'Ella Street lot', 18),
  ('bloomfield', 'Thursday night bocce, all skill levels', 'The court is uneven and that is part of it. Rotating teams, no standings kept.', now() + interval '3 days', 'Bloomfield rec courts', 16),
  ('polish-hill', 'Stair-climb walking group', 'We walk one set of city steps a week and complain the whole way up. Slow pace, real stops.', now() + interval '2 days', 'Brereton and Dobson steps', 12),
  ('polish-hill', 'Pierogi afternoon', 'Dough, potato, cheese, patience. Bring a rolling pin if you have one. We split the results evenly.', now() + interval '11 days', 'Community room on Paulowna', 22)
) AS v(slug, title, body, starts_at, location, capacity) ON v.slug = n.slug;

INSERT INTO public.posts (neighborhood_id, type, title, body, price_cents, is_free, condition)
SELECT n.id, 'marketplace', v.title, v.body, v.price_cents, v.is_free, v.condition
FROM public.neighborhoods n
JOIN (VALUES
  ('lawrenceville', 'Solid oak dining table, seats six', 'Had it fifteen years, one water ring on the corner. Too big for the new place. You bring help to carry it.', 18000, false, 'good'),
  ('lawrenceville', 'Free: three boxes of canning jars', 'Quart and pint, lids mostly usable. Sitting in the basement doing nothing. Porch pickup.', 0, true, 'used'),
  ('bloomfield', 'Kid bike, 20 inch, needs a tube', 'My daughter outgrew it. Frame is straight, brakes are fine, rear tube leaks slow. Cheap because of that.', 2500, false, 'fair'),
  ('bloomfield', 'Cast iron pans, set of two', 'Seasoned properly, no cracks. Downsizing the kitchen. Would rather they stay on this street.', 4500, false, 'good'),
  ('polish-hill', 'Snow shovel and roof rake', 'Bought both after one bad winter and never used the rake. Take them both, one price.', 2000, false, 'like new'),
  ('polish-hill', 'Free: firewood, you split it', 'Maple came down in the yard. Cut to rounds, stacked by the fence. First come, bring a truck.', 0, true, 'used')
) AS v(slug, title, body, price_cents, is_free, condition) ON v.slug = n.slug;

INSERT INTO public.posts (neighborhood_id, type, title, body, needed_by, slots)
SELECT n.id, 'volunteer', v.title, v.body, v.needed_by, v.slots
FROM public.neighborhoods n
JOIN (VALUES
  ('lawrenceville', 'Two hands for a food pantry run', 'Loading and unloading, about ninety minutes. My back is not what it was.', now() + interval '6 days', 2),
  ('lawrenceville', 'Someone to read with a first grader', 'Thirty minutes a week, at the library table so it is public and easy. He is getting there, just needs practice.', now() + interval '20 days', 3),
  ('bloomfield', 'Help my neighbor get to a Tuesday appointment', 'She does not drive anymore. Ten minutes each way, waiting time about an hour.', now() + interval '8 days', 1),
  ('bloomfield', 'Painting hands for the rec room', 'Rollers and tape supplied. One long Saturday and it is done for a decade.', now() + interval '14 days', 6),
  ('polish-hill', 'Sidewalk salting for two older houses', 'Just the two houses on the corner when it ices. Salt is in the bins already.', now() + interval '30 days', 4)
) AS v(slug, title, body, needed_by, slots) ON v.slug = n.slug;

INSERT INTO public.places (neighborhood_id, name, category, address, description, website, phone, hours)
SELECT n.id, v.name, v.category, v.address, v.description, v.website, v.phone, v.hours
FROM public.neighborhoods n
JOIN (VALUES
  ('lawrenceville', 'Arsenal Park', 'Park', '39th and Butler Street', 'Ball fields, a pool in summer, and the only real shade on this end of Butler.', NULL, NULL, 'Dawn to dusk'),
  ('lawrenceville', 'Butler Street Hardware', 'Shop', '3600 Butler Street', 'Loose screws by the each, and someone behind the counter who will tell you which one.', NULL, '412-555-0142', 'Mon-Sat 8-6'),
  ('lawrenceville', 'Corner Laundromat', 'Service', '4501 Butler Street', 'Card machine, working dryers, chairs that are fine. Open late.', NULL, NULL, 'Daily 6-11'),
  ('lawrenceville', 'Riverfront Trail access', 'Park', '40th Street at the river', 'Paved trail both directions. Bench at the ramp is the best spot on the block.', NULL, NULL, 'Always open'),
  ('bloomfield', 'Bloomfield Saturday Market', 'Market', 'Liberty Avenue lot', 'Produce, bread, and a coffee cart, May through November.', NULL, NULL, 'Sat 9-1, seasonal'),
  ('bloomfield', 'Groceria on Liberty', 'Shop', '4700 Liberty Avenue', 'Deli counter, imported tins, and the good olive oil in the back.', NULL, '412-555-0188', 'Mon-Sat 9-7'),
  ('bloomfield', 'Bloomfield Library branch', 'Service', '4600 Liberty Avenue', 'Study tables, story hour on Wednesdays, printing for a dime.', NULL, '412-555-0117', 'Tue-Sat 10-6'),
  ('polish-hill', 'Immaculate Heart of Mary', 'Landmark', '3058 Brereton Street', 'The dome you navigate by. Steps out front are the neighborhood meeting spot.', NULL, NULL, 'Grounds open daily'),
  ('polish-hill', 'Polish Hill Civic Association', 'Service', '3060 Brereton Street', 'Meeting room, tool lending shelf, and the person who knows about the steps.', NULL, '412-555-0173', 'Wed and Sat 10-2'),
  ('polish-hill', 'Herron Avenue overlook', 'Park', 'Herron Avenue at the bend', 'Bench, guardrail, whole city in front of you. Bring a jacket.', NULL, NULL, 'Always open')
) AS v(slug, name, category, address, description, website, phone, hours) ON v.slug = n.slug;