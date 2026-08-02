import { SectionHeading } from "@/components/community/section-heading";
import type { OfficialCommunityItem } from "@/features/community-today/types";
import { formatDateTime } from "@/features/neighborhoods/types";

/**
 * Official, publicly published happenings near the community — library events
 * and park programs. These are clearly attributed and never mixed into the
 * neighbor post grid: they are context, not board content.
 */
export function AroundCommunity({
  communityName,
  items,
  timeZone,
}: {
  communityName: string;
  items: OfficialCommunityItem[];
  timeZone: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="border-t border-border pt-6">
      <SectionHeading>{`Around ${communityName}`}</SectionHeading>
      <p className="mt-2 text-sm text-muted-foreground">
        Published by the city — not posted by neighbors.
      </p>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
        {items.map((item) => {
          const when = item.startsAt ? formatDateTime(item.startsAt, timeZone) : item.scheduleText;
          const details = [item.locationName, item.audience, item.fee].filter(Boolean).join(" · ");
          return (
            <li key={item.id} className="p-4">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-display text-base font-semibold leading-snug underline-offset-4 hover:underline"
              >
                {item.title}
              </a>
              {when ? <p className="mt-1 text-sm text-muted-foreground">{when}</p> : null}
              {details ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{details}</p>
              ) : null}
              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {item.source}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
