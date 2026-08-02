import { Link } from "@tanstack/react-router";

import { SectionHeading } from "@/components/community/section-heading";
import { PlaceholderBar } from "@/components/community/section-placeholder";
import { boardViewLabels, type BoardView } from "@/features/neighborhoods/types";


const ENTRIES: Array<{ view: Exclude<BoardView, "today">; countKey: CountKey; blurb: string }> = [
  { view: "plans", countKey: "plan", blurb: "Things happening you can turn up to" },
  { view: "marketplace", countKey: "marketplace", blurb: "Sold, lent, and given away nearby" },
  { view: "help", countKey: "volunteer", blurb: "Small asks that need a hand" },
  { view: "places", countKey: "places", blurb: "The shops, parks, and services here" },
];

type CountKey = "plan" | "marketplace" | "volunteer" | "places";
type Counts = Record<CountKey, number>;

/**
 * Compact wayfinding to the four boards, with *local* counts only — a count
 * that included nearby communities would misrepresent the block.
 */
export function ExploreBoard({ slug, counts }: { slug: string; counts: Counts | undefined }) {
  return (
    <section className="border-t border-border pt-6">
      <SectionHeading>Explore the board</SectionHeading>
      <ul className="mt-3 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
        {ENTRIES.map((entry) => {
          const count = counts?.[entry.countKey];
          return (
            <li key={entry.view} className="bg-card">
              <Link
                to="/$slug"
                params={{ slug }}
                search={{ view: entry.view }}
                className="flex items-baseline justify-between gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block font-display text-base font-semibold">
                    {boardViewLabels[entry.view]}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{entry.blurb}</span>
                </span>
                {typeof count === "number" ? (
                  <span className="shrink-0 font-sans text-xs tabular-nums text-muted-foreground">
                    {count}
                  </span>
                ) : (
                  // Space is reserved so the row never reflows when counts land.
                  <PlaceholderBar className="h-3 w-4 shrink-0" />
                )}

              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
