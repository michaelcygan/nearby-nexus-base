import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PostListSkeleton } from "@/components/common/post-list-skeleton";
import { neighborhoodPlacesQuery } from "@/features/neighborhoods/queries";
import type { Place } from "@/features/neighborhoods/types";

export const Route = createFileRoute("/n/$slug/directory")({
  loader: ({ params, context }) => {
    context.queryClient.ensureQueryData(neighborhoodPlacesQuery(params.slug));
  },
  head: ({ params }) => ({
    links: [{ rel: "canonical", href: canonicalUrl(`/n/${params.slug}/directory`) }],
    meta: [
      { title: "Directory — Neighborhood Today" },
      {
        name: "description",
        content: "The shops, parks and services that are actually here, kept honest by neighbors.",
      },
      { property: "og:title", content: "Directory — Neighborhood Today" },
      {
        property: "og:description",
        content: "The shops, parks and services that are actually here, kept honest by neighbors.",
      },
      { property: "og:url", content: canonicalUrl(`/n/${params.slug}/directory`) },
    ],
  }),
  component: Directory,
  errorComponent: () => <ErrorState title="The directory didn't load" />,
});

function Directory() {
  const { slug } = Route.useParams();
  return (
    <section>
      <h2 className="text-xl">Directory</h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Places worth knowing about, listed plainly.
      </p>
      <Suspense
        fallback={
          <div className="mt-5">
            <PostListSkeleton />
          </div>
        }
      >
        <PlaceList slug={slug} />
      </Suspense>
    </section>
  );
}

function PlaceList({ slug }: { slug: string }) {
  const { data: places } = useSuspenseQuery(neighborhoodPlacesQuery(slug));

  if (places.length === 0) {
    return (
      <div className="mt-5">
        <EmptyState
          title="Nothing listed yet"
          description="The directory for this neighborhood is still empty."
        />
      </div>
    );
  }

  const grouped = places.reduce<Record<string, Place[]>>((acc, place) => {
    (acc[place.category] ??= []).push(place);
    return acc;
  }, {});

  return (
    <div className="mt-5 space-y-8">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {category}
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {items.map((place) => (
              <li
                key={place.id}
                className="rounded-md border border-border bg-card transition-colors hover:border-primary/50"
              >
                <Link
                  to="/n/$slug/place/$placeId"
                  params={{ slug, placeId: place.id }}
                  className="block rounded-md p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <h4 className="font-display text-base font-semibold">{place.name}</h4>
                  {place.address ? (
                    <p className="mt-1 text-xs text-muted-foreground">{place.address}</p>
                  ) : null}
                  {place.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {place.description}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
