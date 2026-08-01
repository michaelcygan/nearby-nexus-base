import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { NeighborhoodTabs } from "@/components/neighborhood/neighborhood-tabs";
import { SaveNeighborhoodButton } from "@/components/neighborhood/save-neighborhood-button";

import { neighborhoodQuery } from "@/features/neighborhoods/queries";

export const Route = createFileRoute("/n/$slug")({
  loader: async ({ params, context }) => {
    const neighborhood = await context.queryClient.ensureQueryData(
      neighborhoodQuery(params.slug),
    );
    if (!neighborhood) throw notFound();
    return { neighborhood };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Neighborhood not found" }, { name: "robots", content: "noindex" }],
      };
    }
    const { neighborhood } = loaderData;
    const title = `${neighborhood.name}, ${neighborhood.city} — Neighborhood Today`;
    const description =
      neighborhood.tagline ??
      `Plans, marketplace listings, volunteer needs and a local directory for ${neighborhood.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: NeighborhoodLayout,
  errorComponent: () => (
    <AppShell>
      <PageContainer>
        <ErrorState title="This neighborhood didn't load" />
      </PageContainer>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <PageContainer>
        <h1 className="text-3xl">No such neighborhood</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          We couldn't find that neighborhood. Check the link, or pick one from the home page.
        </p>
      </PageContainer>
    </AppShell>
  ),
});

function NeighborhoodLayout() {
  const { slug } = Route.useParams();
  const { data: neighborhood } = useSuspenseQuery(neighborhoodQuery(slug));

  return (
    <AppShell>
      <PageContainer>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {neighborhood?.city}
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl">{neighborhood?.name}</h1>
            {neighborhood?.tagline ? (
              <p className="mt-3 max-w-prose text-base text-muted-foreground">
                {neighborhood.tagline}
              </p>
            ) : null}
          </div>
          {neighborhood ? <SaveNeighborhoodButton neighborhoodId={neighborhood.id} /> : null}
        </header>

        <div className="mt-6">
          <NeighborhoodTabs slug={slug} />
        </div>
        <div className="pt-6">
          <Outlet />
        </div>
      </PageContainer>
    </AppShell>
  );
}
