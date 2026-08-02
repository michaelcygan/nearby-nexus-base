ALTER TABLE public.neighborhoods
  ADD COLUMN IF NOT EXISTS civic_provider text,
  ADD COLUMN IF NOT EXISTS civic_area_codes text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.validate_neighborhood_geo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.center_lat IS NULL) <> (NEW.center_lng IS NULL) THEN
    RAISE EXCEPTION 'Center coordinates must be set together or left empty.';
  END IF;

  IF NEW.center_lat IS NOT NULL AND (NEW.center_lat < -90 OR NEW.center_lat > 90) THEN
    RAISE EXCEPTION 'Latitude must be between -90 and 90.';
  END IF;

  IF NEW.center_lng IS NOT NULL AND (NEW.center_lng < -180 OR NEW.center_lng > 180) THEN
    RAISE EXCEPTION 'Longitude must be between -180 and 180.';
  END IF;

  IF NEW.civic_provider IS NOT NULL AND NEW.civic_provider NOT IN ('chicago_socrata') THEN
    RAISE EXCEPTION 'Unsupported civic provider.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_neighborhood_geo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_neighborhood_geo ON public.neighborhoods;
CREATE TRIGGER validate_neighborhood_geo
BEFORE INSERT OR UPDATE ON public.neighborhoods
FOR EACH ROW EXECUTE FUNCTION public.validate_neighborhood_geo();