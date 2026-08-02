import { SectionHeading } from "@/components/community/section-heading";
import type { CivicServicePulse } from "@/features/community-today/types";

/**
 * A seven-day aggregate of city service requests for this community area.
 * Deliberately aggregate-only: counts by request type, never individual
 * complaints, addresses, or callers. It reads as civic weather, not a
 * scoreboard of neighbors.
 */
export function CityPulse({ pulse }: { pulse: CivicServicePulse | null }) {
  if (!pulse || pulse.entries.length === 0) return null;

  return (
    <section className="border-t border-border pt-6">
      <SectionHeading>From the city</SectionHeading>
      <p className="mt-2 text-sm text-muted-foreground">
        {`What neighbors asked the city to fix in the last ${pulse.windowDays} days.`}
      </p>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
        {pulse.entries.map((entry) => (
          <li key={entry.label} className="flex items-baseline justify-between gap-3 px-4 py-3">
            <span className="min-w-0 text-sm">{entry.label}</span>
            <span className="shrink-0 font-sans text-xs tabular-nums text-muted-foreground">
              {entry.count}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <a
          href={pulse.attributionUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-4"
        >
          Chicago 311 service requests
        </a>
      </p>
    </section>
  );
}
