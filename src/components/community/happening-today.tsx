import { useQuery } from "@tanstack/react-query";

import { SectionHeading } from "@/components/community/section-heading";
import { SectionPlaceholder } from "@/components/community/section-placeholder";
import {
  StandingEventList,
  StandingEventRow,
} from "@/components/community/standing-event-card";
import { DEFAULT_RADIUS_MILES } from "@/features/discovery/types";
import type { Neighborhood } from "@/features/neighborhoods/types";
import { standingEventsQuery } from "@/features/standing-events/queries";
import { getStandingEventOccurrences, todayRange } from "@/features/standing-events/recurrence";
import { useHydrated } from "@/hooks/use-hydrated";

/** Enough local nights that borrowing from neighbors would be padding. */
const LOCAL_TARGET = 3;
const MAX_SHOWN = 4;

/**
 * The recurring nights on in this community today — trivia, karaoke, bingo,
 * drag, live music. Curated and hosted by venues, so this section sits below
 * neighbor posts and links out rather than in.
 *
 * Rendered client-side after hydration because "today" depends on the clock:
 * deciding the day on the server would hand the browser HTML that is already
 * wrong at a midnight boundary.
 */
export function HappeningToday({ community }: { community: Neighborhood }) {
  const hydrated = useHydrated();

  // Ambient section: a failure here must never take the board down.
  const { data, isPending } = useQuery({
    ...standingEventsQuery({
      slug: community.slug,
      includeNearby: true,
      radiusMiles: DEFAULT_RADIUS_MILES,
    }),
    enabled: hydrated,
  });

  if (!hydrated || isPending) return <SectionPlaceholder label="Happening today" rows={2} />;

  const series = data ?? [];
  if (series.length === 0) return null;

  const now = new Date();
  const { start, end } = todayRange(now, community.timezone);
  const occurrences = getStandingEventOccurrences(series, start, end, community.timezone, now);

  const local = occurrences.filter((occurrence) => !occurrence.isNearby);
  const nearby = occurrences.filter((occurrence) => occurrence.isNearby);
  // Neighbors only fill space the community itself isn't using.
  const room = Math.max(0, LOCAL_TARGET - local.length);
  const shown = [...local, ...nearby.slice(0, room)].slice(0, MAX_SHOWN);

  if (shown.length === 0) return null;

  return (
    <section className="border-t border-border pt-6">
      <SectionHeading>Happening today</SectionHeading>
      <p className="mt-2 text-sm text-muted-foreground">
        Recurring nights at local venues — hosted by them, not posted by neighbors.
      </p>
      <StandingEventList>
        {shown.map((occurrence) => (
          <StandingEventRow key={occurrence.key} occurrence={occurrence} showOrigin />
        ))}
      </StandingEventList>
    </section>
  );
}
