import { Link } from "@tanstack/react-router";

import {
  radiusOptions,
  type DiscoveryScope,
  type RadiusMiles,
} from "@/features/discovery/types";
import type { BoardView } from "@/features/neighborhoods/types";

const baseButton =
  "inline-flex min-h-9 items-center rounded-sm border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const selected = "border-primary bg-primary/10 font-medium text-foreground";
const unselected = "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground";

/**
 * "See things posted in this neighborhood, nearby neighborhoods, or across
 * Chicago." Plain links, so scope is shareable and back/forward works.
 */
export function ScopeControl({
  slug,
  view,
  communityName,
  city,
  showCity,
  scope,
  radiusMiles,
}: {
  slug: string;
  view: BoardView;
  communityName: string;
  city: string;
  showCity: boolean;
  scope: DiscoveryScope;
  radiusMiles: RadiusMiles;
}) {
  return (
    <div className="mt-6 space-y-3">
      <nav aria-label="Where to look">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              to="/$slug"
              params={{ slug }}
              search={{ view }}
              aria-current={scope === "local" ? "true" : undefined}
              className={`${baseButton} ${scope === "local" ? selected : unselected}`}
            >
              {communityName}
            </Link>
          </li>
          <li>
            <Link
              to="/$slug"
              params={{ slug }}
              search={{ view, scope: "nearby", radius: radiusMiles }}
              aria-current={scope === "nearby" ? "true" : undefined}
              className={`${baseButton} ${scope === "nearby" ? selected : unselected}`}
            >
              Nearby
            </Link>
          </li>
          {showCity ? (
            <li>
              <Link
                to="/$slug"
                params={{ slug }}
                search={{ view, scope: "city" }}
                aria-current={scope === "city" ? "true" : undefined}
                className={`${baseButton} ${scope === "city" ? selected : unselected}`}
              >
                {city}
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>

      {scope === "nearby" ? (
        <nav aria-label="How far">
          <ul className="flex flex-wrap gap-2">
            {radiusOptions.map((option) => (
              <li key={option}>
                <Link
                  to="/$slug"
                  params={{ slug }}
                  search={{ view, scope: "nearby", radius: option }}
                  aria-current={option === radiusMiles ? "true" : undefined}
                  className={`${baseButton} ${option === radiusMiles ? selected : unselected}`}
                >
                  {option} mi
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
