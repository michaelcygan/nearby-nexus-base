-- Curated, externally hosted recurring events. One row per weekly series;
-- occurrences are derived at read time and never written to the database.
CREATE TYPE public.standing_event_status AS ENUM ('draft', 'active', 'paused');

CREATE TYPE public.standing_event_category AS ENUM (
  'trivia', 'karaoke', 'bingo', 'games', 'drag', 'live_music', 'show_tunes', 'nightlife'
);

CREATE TABLE public.standing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable human-readable key: makes seed migrations idempotent upserts.
  source_key text NOT NULL UNIQUE,
  -- Nullable so an admin can hold a series as a draft before its community exists.
  neighborhood_id uuid REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
  place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  venue_name text NOT NULL,
  venue_address text,
  title text NOT NULL,
  description text,
  category public.standing_event_category NOT NULL,
  -- 0 = Sunday ... 6 = Saturday. Multiple weekdays share one series.
  days_of_week smallint[] NOT NULL,
  start_time time NOT NULL,
  end_time time,
  -- 1 when the event ends after midnight, on the following calendar day.
  end_day_offset smallint NOT NULL DEFAULT 0,
  timezone text NOT NULL DEFAULT 'America/Chicago',
  -- Provenance: never a resident post, never hosted by Neighborhood Today.
  origin text NOT NULL DEFAULT 'curated_external',
  source_url text NOT NULL,
  image_url text,
  image_attribution text,
  exception_note text,
  starts_on date,
  ends_on date,
  excluded_dates date[] NOT NULL DEFAULT '{}',
  status public.standing_event_status NOT NULL DEFAULT 'draft',
  last_verified_at date,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.standing_events.days_of_week IS '0 = Sunday through 6 = Saturday';

CREATE INDEX standing_events_neighborhood_status_idx
  ON public.standing_events (neighborhood_id, status);

GRANT SELECT ON public.standing_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.standing_events TO authenticated;
GRANT ALL ON public.standing_events TO service_role;

ALTER TABLE public.standing_events ENABLE ROW LEVEL SECURITY;

-- Public read is deliberately narrow: active series in published communities only.
CREATE POLICY "Active standing events are public"
ON public.standing_events FOR SELECT
TO anon, authenticated
USING (
  status = 'active'
  AND neighborhood_id IS NOT NULL
  AND public.is_published_community(neighborhood_id)
);

CREATE POLICY "Admins can read every standing event"
ON public.standing_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create standing events"
ON public.standing_events FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update standing events"
ON public.standing_events FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete standing events"
ON public.standing_events FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_standing_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  day smallint;
BEGIN
  IF array_length(NEW.days_of_week, 1) IS NULL OR array_length(NEW.days_of_week, 1) > 7 THEN
    RAISE EXCEPTION 'A standing event needs between one and seven weekdays.';
  END IF;

  FOREACH day IN ARRAY NEW.days_of_week LOOP
    IF day < 0 OR day > 6 THEN
      RAISE EXCEPTION 'Weekdays must be 0 (Sunday) through 6 (Saturday).';
    END IF;
  END LOOP;

  IF NEW.end_day_offset NOT IN (0, 1) THEN
    RAISE EXCEPTION 'End day offset must be 0 or 1.';
  END IF;

  IF NEW.source_url !~* '^https://' THEN
    RAISE EXCEPTION 'Source URL must be a secure https link.';
  END IF;

  IF NEW.image_url IS NOT NULL AND NEW.image_url !~* '^https://' THEN
    RAISE EXCEPTION 'Image URL must be a secure https link.';
  END IF;

  IF NEW.ends_on IS NOT NULL AND NEW.starts_on IS NOT NULL AND NEW.ends_on < NEW.starts_on THEN
    RAISE EXCEPTION 'The series cannot end before it starts.';
  END IF;

  -- A published series must be placed on a real community board.
  IF NEW.status = 'active' AND NEW.neighborhood_id IS NULL THEN
    RAISE EXCEPTION 'An active standing event must belong to a community.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_standing_event_before_write
BEFORE INSERT OR UPDATE ON public.standing_events
FOR EACH ROW EXECUTE FUNCTION public.validate_standing_event();

CREATE TRIGGER touch_standing_events_updated_at
BEFORE UPDATE ON public.standing_events
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed data verified against first-party venue sources on 2026-08-01.
-- Upserted on source_key so re-applying can never duplicate a series.
INSERT INTO public.standing_events (
  source_key, neighborhood_id, venue_name, venue_address, title, category,
  days_of_week, start_time, end_time, end_day_offset, source_url,
  exception_note, ends_on, status, last_verified_at
) VALUES
  ('gracie-omalleys-monday-game-night', (SELECT id FROM public.neighborhoods WHERE slug = 'edgewater'), 'Gracie O''Malley''s', '6334 N Clark St', 'Gracie''s Monday Game Night', 'games', ARRAY[1]::smallint[], '18:00', NULL, 0, 'https://gracieomalleyschicago.com/mondays-gracies-monday-game-night-gracie-omalleys-edgewater/', 'Runs until close. D&D, board games, card games, and Nintendo.', NULL, 'active', '2026-08-01'),
  ('replay-andersonville-karaoke-monday', (SELECT id FROM public.neighborhoods WHERE slug = 'edgewater'), 'Replay Andersonville', '5358 N Clark St', 'Karaoke Mondays', 'karaoke', ARRAY[1]::smallint[], '21:00', NULL, 0, 'https://replayandersonville.com/our-events/', NULL, NULL, 'active', '2026-08-01'),
  ('fireside-chicago-tuesday-trivia', (SELECT id FROM public.neighborhoods WHERE slug = 'edgewater'), 'Fireside Chicago', '5739 N Ravenswood Ave', 'Tuesday Night Trivia', 'trivia', ARRAY[2]::smallint[], '19:30', NULL, 0, 'https://www.firesidechicago.com/calendar', NULL, NULL, 'active', '2026-08-01'),
  ('replay-andersonville-stewpendous-trivia', (SELECT id FROM public.neighborhoods WHERE slug = 'edgewater'), 'Replay Andersonville', '5358 N Clark St', 'Stewpendous Trivia', 'trivia', ARRAY[3]::smallint[], '19:00', NULL, 0, 'https://replayandersonville.com/events/stewpendous-trivia-16/', NULL, NULL, 'active', '2026-08-01'),

  ('replay-lakeview-mario-kart-monday', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Replay Lakeview', '3439 N Halsted St', 'Mario Kart Monday', 'games', ARRAY[1]::smallint[], '19:00', NULL, 0, 'https://replaylakeview.com/', NULL, NULL, 'active', '2026-08-01'),
  ('replay-lakeview-karaoke-wednesday', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Replay Lakeview', '3439 N Halsted St', 'Karaoke Wednesday', 'karaoke', ARRAY[3]::smallint[], '21:00', NULL, 0, 'https://replaylakeview.com/', 'First and third Wednesdays may carry special themes.', NULL, 'active', '2026-08-01'),
  ('replay-lakeview-thirsty-thursday-trivia', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Replay Lakeview', '3439 N Halsted St', 'Thirsty Thursday Trivia', 'trivia', ARRAY[4]::smallint[], '19:00', NULL, 0, 'https://replaylakeview.com/', NULL, NULL, 'active', '2026-08-01'),
  ('sidetrack-musical-monday-show-tunes', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Sidetrack', '3349 N Halsted St', 'Musical Monday Show Tunes', 'show_tunes', ARRAY[1]::smallint[], '20:00', '02:00', 1, 'https://www.sidetrackchicago.com/', NULL, NULL, 'active', '2026-08-01'),
  ('sidetrack-trivia-tuesday-with-stew', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Sidetrack', '3349 N Halsted St', 'Trivia Tuesday with Stew', 'trivia', ARRAY[2]::smallint[], '20:00', NULL, 0, 'https://www.sidetrackchicago.com/calendar/', 'Usually 9:00 PM on the first Tuesday after OUTspoken.', NULL, 'active', '2026-08-01'),
  ('sidetrack-sunday-funday-show-tunes', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Sidetrack', '3349 N Halsted St', 'Sunday Funday Show Tunes', 'show_tunes', ARRAY[0]::smallint[], '15:00', '21:00', 0, 'https://www.sidetrackchicago.com/', NULL, NULL, 'active', '2026-08-01'),
  ('good-times-brewery-tuesday-trivia', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Good Times Brewery', '3827 N Broadway', 'Tuesday Trivia', 'trivia', ARRAY[2]::smallint[], '19:00', NULL, 0, 'https://gtbchicago.com/events', NULL, NULL, 'active', '2026-08-01'),
  ('the-river-trivia-tuesdays', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'The River', '2909 N Sheffield Ave', 'Trivia Tuesdays', 'trivia', ARRAY[2]::smallint[], '19:30', NULL, 0, 'https://www.theriverchicago.com/events/trivia-tuesdays', NULL, NULL, 'active', '2026-08-01'),
  ('lark-extreme-bingo', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Lark', '3441 N Halsted St', 'Extreme Bingo', 'bingo', ARRAY[4]::smallint[], '19:00', NULL, 0, 'https://larkchicago.com/lark-calendar/', NULL, NULL, 'active', '2026-08-01'),
  ('lark-weekend-karaoke', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Lark', '3441 N Halsted St', 'Karaoke', 'karaoke', ARRAY[5,6]::smallint[], '22:00', NULL, 0, 'https://larkchicago.com/lark-calendar/', NULL, NULL, 'active', '2026-08-01'),
  ('lark-weekend-drag-brunch', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Lark', '3441 N Halsted St', 'Weekend Drag Brunch', 'drag', ARRAY[0,6]::smallint[], '11:00', '15:00', 0, 'https://larkchicago.com/lark-calendar/', NULL, NULL, 'active', '2026-08-01'),
  ('murphys-bleachers-pub-trivia', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Murphy''s Bleachers', '3655 N Sheffield Ave', 'Pub Trivia', 'trivia', ARRAY[4]::smallint[], '19:30', '22:00', 0, 'https://murphysbleachers.com/murphys-events/', 'Does not take place on Cubs home-game days.', NULL, 'active', '2026-08-01'),
  ('roscoes-friday-night-lights', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Roscoe''s Tavern', '3356 N Halsted St', 'Friday Night Lights', 'nightlife', ARRAY[5]::smallint[], '22:00', NULL, 0, 'https://roscoes.com/', NULL, NULL, 'active', '2026-08-01'),
  ('roscoes-saturday-drag-brunch', (SELECT id FROM public.neighborhoods WHERE slug = 'lakeview'), 'Roscoe''s Tavern', '3356 N Halsted St', 'Saturday Drag Brunch', 'drag', ARRAY[6]::smallint[], '12:00', NULL, 0, 'https://roscoes.com/', 'Seatings at noon and 2:00 PM.', NULL, 'active', '2026-08-01'),

  ('clover-pp-trivia-monday', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Clover Sports and Leisure', '810 W Diversey Pkwy', 'P&P Trivia', 'trivia', ARRAY[1]::smallint[], '19:30', NULL, 0, 'https://cloverlincolnpark.com/pp-trivia-mondays-at-clover-lincoln-park/', NULL, NULL, 'active', '2026-08-01'),
  ('clover-music-video-bingo', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Clover Sports and Leisure', '810 W Diversey Pkwy', 'Music Video Bingo', 'bingo', ARRAY[4]::smallint[], '19:30', NULL, 0, 'https://cloverlincolnpark.com/music-video-bingo-clover-lincoln-park/', 'Karaoke follows around 9:30 PM.', NULL, 'active', '2026-08-01'),
  ('clover-karaoke-with-asia', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Clover Sports and Leisure', '810 W Diversey Pkwy', 'Karaoke with Asia', 'karaoke', ARRAY[5,6]::smallint[], '21:00', NULL, 0, 'https://cloverlincolnpark.com/karaoke-with-asia-fridays-saturdays/', NULL, NULL, 'active', '2026-08-01'),
  ('duffys-free-bar-trivia', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Duffy''s Tavern and Grille', '420 W Diversey Pkwy', 'Free Bar Trivia', 'trivia', ARRAY[3]::smallint[], '19:00', NULL, 0, 'https://duffys-tavern.com/', NULL, NULL, 'active', '2026-08-01'),
  ('gaslight-trivia-night', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Gaslight Bar & Grille', '2450 N Clark St', 'Trivia Night', 'trivia', ARRAY[3]::smallint[], '19:30', NULL, 0, 'https://www.gaslightbar.com/events/trivia-night', 'First-party listing currently runs through May 31, 2027.', '2027-05-31', 'active', '2026-08-01'),
  ('parlay-lincoln-park-music-bingo', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Parlay Lincoln Park', '950 W Wrightwood Ave', 'Music Bingo', 'bingo', ARRAY[3]::smallint[], '19:30', NULL, 0, 'https://www.exploretock.com/parlay-lincoln-park/experience/487835/trivia', NULL, NULL, 'active', '2026-08-01'),
  ('brandos-on-demand-karaoke-weekdays', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Brando''s Speakeasy', '2265 N Lincoln Ave', 'On-demand Karaoke', 'karaoke', ARRAY[3,4,5]::smallint[], '17:00', '02:00', 1, 'https://brandoschicago.com/lincoln-park/hours/', NULL, NULL, 'active', '2026-08-01'),
  ('brandos-on-demand-karaoke-saturday', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Brando''s Speakeasy', '2265 N Lincoln Ave', 'On-demand Karaoke', 'karaoke', ARRAY[6]::smallint[], '17:00', '03:00', 1, 'https://brandoschicago.com/lincoln-park/hours/', NULL, NULL, 'active', '2026-08-01'),
  ('galway-arms-katie-grennan-sunday', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Galway Arms', '2442 N Clark St', 'Katie Grennan / Sunday Irish Music', 'live_music', ARRAY[0]::smallint[], '20:00', '22:00', 0, 'https://galwayarms.com/live-music', NULL, NULL, 'active', '2026-08-01'),
  ('galway-arms-pat-quinn-live', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Galway Arms', '2442 N Clark St', 'Pat Quinn Live', 'live_music', ARRAY[2]::smallint[], '20:00', '22:00', 0, 'https://galwayarms.com/live-music', NULL, NULL, 'active', '2026-08-01'),
  ('galway-arms-liam-kantor-live', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Galway Arms', '2442 N Clark St', 'Liam Kantor Live', 'live_music', ARRAY[3]::smallint[], '20:00', '22:00', 0, 'https://galwayarms.com/live-music', NULL, NULL, 'active', '2026-08-01'),
  ('galway-arms-fleming-kennedy-live', (SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'), 'Galway Arms', '2442 N Clark St', 'Tim Fleming and Lexi Kennedy Live', 'live_music', ARRAY[4]::smallint[], '20:00', '22:00', 0, 'https://galwayarms.com/live-music', NULL, NULL, 'active', '2026-08-01'),

  -- Andersonville is not yet a community here, so these stay unpublished drafts
  -- rather than being falsely assigned to Edgewater.
  ('meeting-house-trivia-is-a-drag', NULL, 'Meeting House Tavern', '5025 N Clark St', 'Trivia Is a Drag', 'drag', ARRAY[2]::smallint[], '19:30', '22:00', 0, 'https://meetinghousetavern.com/', 'Awaiting the correct community assignment (Andersonville).', NULL, 'draft', '2026-08-01'),
  ('meeting-house-lets-get-glam-bingo', NULL, 'Meeting House Tavern', '5025 N Clark St', 'Let''s Get Glam Bingo', 'bingo', ARRAY[3]::smallint[], '19:30', '22:30', 0, 'https://meetinghousetavern.com/', 'Awaiting the correct community assignment (Andersonville).', NULL, 'draft', '2026-08-01'),
  ('meeting-house-karaoke-cabaret', NULL, 'Meeting House Tavern', '5025 N Clark St', 'Karaoke Cabaret', 'karaoke', ARRAY[4]::smallint[], '21:00', '01:00', 1, 'https://meetinghousetavern.com/', 'Awaiting the correct community assignment (Andersonville).', NULL, 'draft', '2026-08-01'),
  ('meeting-house-friday-night-house-party', NULL, 'Meeting House Tavern', '5025 N Clark St', 'Friday Night House Party', 'nightlife', ARRAY[5]::smallint[], '21:00', '02:00', 1, 'https://meetinghousetavern.com/', 'Awaiting the correct community assignment (Andersonville).', NULL, 'draft', '2026-08-01'),
  ('meeting-house-80s-afternoon', NULL, 'Meeting House Tavern', '5025 N Clark St', '''80s Afternoon', 'nightlife', ARRAY[6]::smallint[], '14:00', '17:00', 0, 'https://meetinghousetavern.com/', 'Awaiting the correct community assignment (Andersonville).', NULL, 'draft', '2026-08-01'),
  ('meeting-house-kwizmaster-trivia', NULL, 'Meeting House Tavern', '5025 N Clark St', 'Kwizmaster Trivia', 'trivia', ARRAY[0]::smallint[], '14:30', '17:00', 0, 'https://meetinghousetavern.com/', 'Awaiting the correct community assignment (Andersonville).', NULL, 'draft', '2026-08-01')
ON CONFLICT (source_key) DO UPDATE SET
  neighborhood_id = EXCLUDED.neighborhood_id,
  venue_name = EXCLUDED.venue_name,
  venue_address = EXCLUDED.venue_address,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  days_of_week = EXCLUDED.days_of_week,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  end_day_offset = EXCLUDED.end_day_offset,
  source_url = EXCLUDED.source_url,
  exception_note = EXCLUDED.exception_note,
  ends_on = EXCLUDED.ends_on,
  status = EXCLUDED.status,
  last_verified_at = EXCLUDED.last_verified_at;