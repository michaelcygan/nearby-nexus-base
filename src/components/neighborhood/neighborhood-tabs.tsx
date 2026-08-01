import { Link } from "@tanstack/react-router";

const tabs = [
  { to: "/n/$slug", label: "Overview", exact: true },
  { to: "/n/$slug/plans", label: "Plans", exact: false },
  { to: "/n/$slug/marketplace", label: "Marketplace", exact: false },
  { to: "/n/$slug/volunteer", label: "Volunteer", exact: false },
  { to: "/n/$slug/store", label: "Store", exact: false },
  { to: "/n/$slug/directory", label: "Directory", exact: false },
] as const;

export function NeighborhoodTabs({ slug }: { slug: string }) {
  return (
    <nav aria-label="Neighborhood sections" className="border-b border-border">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <li key={tab.to} className="shrink-0">
            <Link
              to={tab.to}
              params={{ slug }}
              activeOptions={{ exact: tab.exact }}
              className="inline-block border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{
                className: "border-primary text-foreground font-medium",
              }}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
