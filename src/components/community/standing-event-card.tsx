import { standingEventCategoryLabels } from "@/features/standing-events/types";
import type { StandingEventOccurrence } from "@/features/standing-events/recurrence";

/**
 * One curated standing event, rendered as an outbound reference rather than a
 * board post. There is no RSVP and no detail page on purpose: the venue owns
 * the event, so the only action is to go read the venue's own page. The
 * "Check with venue" line is permanent — a weekly night can be cancelled
 * without anyone telling us.
 */

/** Only https venue links are ever rendered; anything else is dropped. */
function httpsHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function StandingEventRow({
  occurrence,
  showWhen = true,
  showOrigin = false,
}: {
  occurrence: StandingEventOccurrence;
  /** Off when a day heading already states when this is. */
  showWhen?: boolean;
  /** On when the row may come from a neighboring community. */
  showOrigin?: boolean;
}) {
  const { event } = occurrence;
  const href = httpsHref(event.source_url);

  const details = [
    showWhen ? occurrence.whenLabel : occurrence.timeLabel,
    event.venue_name,
    showOrigin && occurrence.isNearby ? event.origin.name : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="p-4">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="font-display text-base font-semibold leading-snug underline-offset-4 hover:underline"
        >
          {event.title}
        </a>
      ) : (
        <span className="font-display text-base font-semibold leading-snug">{event.title}</span>
      )}

      <p className="mt-1 text-sm text-muted-foreground">{details}</p>

      {event.exception_note ? (
        <p className="mt-0.5 text-sm text-muted-foreground">{event.exception_note}</p>
      ) : null}

      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {standingEventCategoryLabels[event.category]} · Check with venue
      </p>
    </li>
  );
}

export function StandingEventList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
      {children}
    </ul>
  );
}
