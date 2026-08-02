ALTER TABLE public.neighborhoods
  ADD COLUMN IF NOT EXISTS center_lat double precision,
  ADD COLUMN IF NOT EXISTS center_lng double precision;

ALTER TABLE public.neighborhoods
  DROP CONSTRAINT IF EXISTS neighborhoods_center_lat_range;
ALTER TABLE public.neighborhoods
  ADD CONSTRAINT neighborhoods_center_lat_range
  CHECK (center_lat IS NULL OR (center_lat >= -90 AND center_lat <= 90));

ALTER TABLE public.neighborhoods
  DROP CONSTRAINT IF EXISTS neighborhoods_center_lng_range;
ALTER TABLE public.neighborhoods
  ADD CONSTRAINT neighborhoods_center_lng_range
  CHECK (center_lng IS NULL OR (center_lng >= -180 AND center_lng <= 180));

ALTER TABLE public.neighborhoods
  DROP CONSTRAINT IF EXISTS neighborhoods_center_pair;
ALTER TABLE public.neighborhoods
  ADD CONSTRAINT neighborhoods_center_pair
  CHECK ((center_lat IS NULL) = (center_lng IS NULL));

-- Approximate community centers for the published Chicago communities.
-- Sourced from commonly published community-area centroids; these are
-- discovery anchors for distance math only, not boundary claims.
UPDATE public.neighborhoods SET center_lat = 41.9870, center_lng = -87.6600 WHERE slug = 'edgewater';
UPDATE public.neighborhoods SET center_lat = 41.9400, center_lng = -87.6539 WHERE slug = 'lakeview';
UPDATE public.neighborhoods SET center_lat = 41.9214, center_lng = -87.6513 WHERE slug = 'lincoln-park';