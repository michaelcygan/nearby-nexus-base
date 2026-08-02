import { Link } from "@tanstack/react-router";

import { SectionHeading } from "@/components/community/section-heading";
import type { Place } from "@/features/neighborhoods/types";

const PREVIEW_LIMIT = 4;

/** A short directory taste, with the full Places board one tap away. */
export function UsefulPlaces({ slug, places }: { slug: string; places: Place[] }) {
  if (places.length === 0) return null;
  const preview = places.slice(0, PREVIEW_LIMIT);

  return (
    <section className="border-t border-border pt-6">
      <SectionHeading>Useful places</SectionHeading>
      <ul className="mt-3 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
        {preview.map((place) => (
          <li key={place.id} className="bg-card">
            <Link
              to="/$slug/place/$placeId"
              params={{ slug, placeId: place.id }}
              className="block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block font-display text-base font-semibold leading-snug">
                {place.name}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{place.category}</span>
            </Link>
          </li>
        ))}
      </ul>
      {places.length > preview.length ? (
        <p className="mt-3 text-sm">
          <Link
            to="/$slug"
            params={{ slug }}
            search={{ view: "places" }}
            className="text-foreground underline underline-offset-4"
          >
            {`See all ${places.length} places`}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
