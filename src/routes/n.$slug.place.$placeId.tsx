import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { placeQuery } from "@/features/neighborhoods/queries";

export const Route = createFileRoute("/n/$slug/place/$placeId")({
  loader: async ({ params, context }) => {
    const place = await context.queryClient.ensureQueryData(placeQuery(params.placeId));
    if (!place) throw notFound();
    return { place };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Place unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const { place } = loaderData;
    const title = `${place.name} — ${place.neighborhood.name}`;
    const description =
      place.description ?? `${place.category} in ${place.neighborhood.name}, ${place.neighborhood.city}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description.slice(0, 155) },
        { property: "og:title", content: title },
        { property: "og:description", content: description.slice(0, 155) },
      ],
    };
  },
  component: PlaceDetailPage,
  errorComponent: () => <ErrorState title="This place didn't load" />,
  notFoundComponent: () => (
    <EmptyState
      title="Not in the directory"
      description="This entry may have been removed. Check the directory for the current list."
    />
  ),
});

function PlaceDetailPage() {
  const { slug, placeId } = Route.useParams();
  const { data: place } = useSuspenseQuery(placeQuery(placeId));

  if (!place) return <EmptyState title="Not in the directory" />;

  const facts: Array<[string, string]> = [];
  if (place.address) facts.push(["Address", place.address]);
  if (place.hours) facts.push(["Hours", place.hours]);
  if (place.phone) facts.push(["Phone", place.phone]);

  return (
    <article className="max-w-2xl">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {place.category}
      </p>
      <h2 className="mt-2 text-2xl sm:text-3xl">{place.name}</h2>

      {facts.length > 0 ? (
        <dl className="mt-6 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label} className="bg-card p-4">
              <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-1 text-base">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {place.description ? (
        <p className="mt-6 text-base leading-relaxed text-foreground/90">{place.description}</p>
      ) : null}

      {place.website ? (
        <p className="mt-4 text-sm">
          <a
            href={place.website}
            className="text-foreground underline underline-offset-4"
            rel="noreferrer noopener"
            target="_blank"
          >
            Visit website
          </a>
        </p>
      ) : null}

      <p className="mt-8 text-sm">
        <Link
          to="/n/$slug/directory"
          params={{ slug }}
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Back to the directory
        </Link>
      </p>
    </article>
  );
}
