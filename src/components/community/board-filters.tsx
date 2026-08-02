import { Link } from "@tanstack/react-router";

import { boardViewLabels, boardViews, type BoardView } from "@/features/neighborhoods/types";

/**
 * Filters are links that only change the `view` search param — there is a
 * single community page implementation behind all five of them.
 */
export function BoardFilters({ slug, active }: { slug: string; active: BoardView }) {
  return (
    <nav aria-label="Board filters" className="border-b border-border">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {boardViews.map((view) => {
          const isActive = view === active;
          return (
            <li key={view} className="shrink-0">
              <Link
                to="/$slug"
                params={{ slug }}
                search={{ view }}
                aria-current={isActive ? "page" : undefined}
                className={`inline-block border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {boardViewLabels[view]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
