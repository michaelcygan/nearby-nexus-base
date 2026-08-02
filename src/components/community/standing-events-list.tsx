import { useQuery } from "@tanstack/react-query";

import { SectionHeading } from "@/components/community/section-heading";
import { SectionPlaceholder } from "@/components/community/section-placeholder";
import { StandingEventList, StandingEventRow } from "@/components/community/standing-event-card";
import { DEFAULT_RADIUS_MILES, type RadiusMiles } from "@/features/discovery/types";
import type { Neighborhood } from "@/features/neighborhoods/types";
import { standingEventsQuery } from "@/features/standing-events/queries";
import {
  getStandingEventOccurrences,
  upcomingRange,
  type StandingEventOccurrence,
} from "@/features/standing-events/recurrence";
import { useHydrated } from "@/hooks/use-hydrated";

const UPCOMING_DAYS = 7;

/** Enough local nights that borrowing from neighbors would be padding. */
const LOCAL_TARGET = 2;
const MAX_PER_DAY = 3;

/**
 * The week ahead of standing local events on the Plans tab, grouped by day.
 *
 * Plans is where a neighbor looks for something to do, so the recurring nights
 * belong here in full — but below neighbor plans and visually separated, since
 * these are venue-run and only ever link out. Local community is shown first,
 * with nearby communities filling in only when the local board is thin.
 */
export function StandingEventsList({
  community,
  includeNearby = true,
  radiusMiles = DEFAULT_RADIUS_MILES,
}: {
  community: Neighborhood;
  includeNearby?: boolean;
  radiusMiles?: RadiusMiles;
}) {
  const hydrated = useHydrated();

  const { data, isPending } = useQuery({
    ...standingEventsQuery({
      slug: community.slug,
      includeNearby,
      radiusMiles,
    }),
    enabled: hydrated,
  });

  if (!hydrated || isPending) return <SectionPlaceholder label="Standing local events" rows={3} />;

  const series = data ?? [];
  if (series.length === 0) return null;

  const now = new Date();
  const { start, end } = upcomingRange(now, community.timezone, UPCOMING_DAYS);
  const occurrences = getStandingEventOccurrences(series, start, end, community.timezone, now);
  if (occurrences.length === 0) return null;

  // Occurrences arrive in time order, so grouping preserves the day order.
  const days: Array<{ label: string; items: StandingEventOccurrence[] }> = [];
  for (const occurrence of occurrences) {
    const current = days[days.length - 1];
    if (current && current.label === occurrence.dayLabel) current.items.push(occurrence);
    else days.push({ label: occurrence.dayLabel, items: [occurrence] });
  }

  // Cap each day: local-first, then nearby backfill, never more than MAX_PER_DAY.
  const cappedDays = days.map((day) => {
    const local = day.items.filter((item) => !item.isNearby);
    const nearby = day.items.filter((item) => item.isNearby);
    const room = Math.max(0, LOCAL_TARGET - local.length);
    const items = [...local, ...nearby.slice(0, room)].slice(0, MAX_PER_DAY);
    return { ...day, items };
  });

  return (
    <section className="border-t border-border pt-6">
      <SectionHeading>Standing local events</SectionHeading>
      <p className="mt-2 text-sm text-muted-foreground">
        Weekly nights hosted by venues in {community.name} and nearby communities. Times can change
        — check with the venue before heading out.
      </p>

      <div className="mt-4 space-y-5">
        {cappedDays.map((day, index) => (
          <div key={`${day.label}-${index}`}>
            <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {day.label}
            </h3>
            <StandingEventList>
              {day.items.map((occurrence) => (
                <StandingEventRow
                  key={occurrence.key}
                  occurrence={occurrence}
                  showWhen={false}
                  showOrigin={occurrence.isNearby}
                />
              ))}
            </StandingEventList>
          </div>
        ))}
      </div>
    </section>
  );
}
