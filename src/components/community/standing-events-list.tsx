import { useQuery } from "@tanstack/react-query";

import { SectionHeading } from "@/components/community/section-heading";
import { SectionPlaceholder } from "@/components/community/section-placeholder";
import { StandingEventList, StandingEventRow } from "@/components/community/standing-event-card";
import type { Neighborhood } from "@/features/neighborhoods/types";
import { standingEventsQuery } from "@/features/standing-events/queries";
import {
  getStandingEventOccurrences,
  upcomingRange,
  type StandingEventOccurrence,
} from "@/features/standing-events/recurrence";
import { useHydrated } from "@/hooks/use-hydrated";

const UPCOMING_DAYS = 7;

/**
 * The week ahead of standing local events on the Plans tab, grouped by day.
 *
 * Plans is where a neighbor looks for something to do, so the recurring nights
 * belong here in full — but below neighbor plans and visually separated, since
 * these are venue-run and only ever link out. Local community only: the Plans
 * discovery lens already governs how far neighbor posts reach.
 */
export function StandingEventsList({ community }: { community: Neighborhood }) {
  const hydrated = useHydrated();

  const { data, isPending } = useQuery({
    ...standingEventsQuery({ slug: community.slug }),
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

  return (
    <section className="border-t border-border pt-6">
      <SectionHeading>Standing local events</SectionHeading>
      <p className="mt-2 text-sm text-muted-foreground">
        Weekly nights hosted by venues in {community.name}. Times can change — check with the venue
        before heading out.
      </p>

      <div className="mt-4 space-y-5">
        {days.map((day) => (
          <div key={day.label}>
            <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {day.label}
            </h3>
            <StandingEventList>
              {day.items.map((occurrence) => (
                <StandingEventRow key={occurrence.key} occurrence={occurrence} showWhen={false} />
              ))}
            </StandingEventList>
          </div>
        ))}
      </div>
    </section>
  );
}
