INSERT INTO public.neighborhoods (slug, name, city, state_code, location_type, timezone, status, tagline, about)
VALUES (
  'lincoln-park',
  'Lincoln Park',
  'Chicago',
  'IL',
  'neighborhood',
  'America/Chicago',
  'published',
  'What''s happening, needed, offered, and shared across Lincoln Park today.',
  'Lincoln Park is a North Side community between North Avenue and Diversey Parkway, stretching from the Chicago River toward Lake Michigan. Its residential streets, DePaul area, neighborhood business corridors, parks, cultural institutions, and lakefront share one public community board.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  state_code = EXCLUDED.state_code,
  location_type = EXCLUDED.location_type,
  timezone = EXCLUDED.timezone,
  status = EXCLUDED.status,
  tagline = EXCLUDED.tagline,
  about = EXCLUDED.about,
  updated_at = now();

WITH community AS (
  SELECT id FROM public.neighborhoods WHERE slug = 'lincoln-park'
), seed(name, category, address, phone, website, description) AS (
  VALUES
    ('Lincoln Park Branch, Chicago Public Library', 'Library', '1150 W. Fullerton Ave., Chicago, IL 60614', '(312) 744-1926', 'https://www.chipublib.org/locations/44/', 'Public library offering books, events, computers, meeting and study space, youth programming, and neighborhood resources.'),
    ('Oz Park', 'Park', '2021 N. Burling St., Chicago, IL 60614', NULL, 'https://www.chicagoparkdistrict.com/parks-facilities/oz-park', 'Neighborhood park with playgrounds, athletic areas, gardens, open space, and sculptures inspired by The Wizard of Oz.'),
    ('Lincoln Park Cultural Center', 'Recreation', '2045 N. Lincoln Park West, Chicago, IL 60614', NULL, 'https://www.chicagoparkdistrict.com/parks-facilities/lincoln-park-cultural-center-0', 'Chicago Park District cultural and recreation center with community programs, arts facilities, classes, meeting space, and activities for multiple ages.'),
    ('Lincoln Park Conservatory', 'Garden', '2391 N. Stockton Dr., Chicago, IL 60614', NULL, 'https://www.chicagoparkdistrict.com/parks-facilities/lincoln-park-conservatory', 'Historic public conservatory and garden featuring tropical plants, seasonal displays, and indoor botanical rooms.'),
    ('Lincoln Park Zoo', 'Community attraction', '2400 N. Cannon Dr., Chicago, IL 60614', '(312) 742-2000', 'https://www.lpzoo.org/', 'Free public zoo and wildlife institution offering animal habitats, educational programs, conservation work, and community events.'),
    ('Peggy Notebaert Nature Museum', 'Museum', '2430 N. Cannon Dr., Chicago, IL 60614', '(773) 755-5100', 'https://naturemuseum.org/', 'Nature and science museum focused on the ecology, wildlife, and natural history of Chicago and the surrounding region.'),
    ('Lincoln Park Chamber of Commerce', 'Community resource', '2468 N. Lincoln Ave., Chicago, IL 60614', '(773) 880-5200', 'https://www.lincolnparkchamber.com/', 'Local organization connecting neighborhood businesses, community programs, events, public-space initiatives, and small-business resources.')
)
INSERT INTO public.places (neighborhood_id, name, category, address, phone, website, description)
SELECT c.id, s.name, s.category, s.address, s.phone, s.website, s.description
FROM community c CROSS JOIN seed s
WHERE NOT EXISTS (
  SELECT 1 FROM public.places p WHERE p.neighborhood_id = c.id AND p.name = s.name
);