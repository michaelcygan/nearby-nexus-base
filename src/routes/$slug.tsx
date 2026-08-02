import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, notFound } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { PostToCommunity } from "@/components/community/post-to-community";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { neighborhoodQuery } from "@/features/neighborhoods/queries";
import { placeLine } from "@/features/neighborhoods/types";
import { isReservedSlug } from "@/lib/reserved-slugs";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params, context }) => {
    // Static routes win over `$slug`, but a reserved name must never resolve to
    // a community even if someone seeds one with that slug.
    if (isReservedSlug(params.slug)) throw notFound();
    const community = await context.queryClient.ensureQueryData(neighborhoodQuery(params.slug));
    if (!community) throw notFound();
    return { community };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Community not found" }, { name: "robots", content: "noindex" }],
      };
    }
    const { community } = loaderData;
    const where = placeLine(community);
    const title = `${community.name}, ${where} — Neighborhood Today`;
    const description =
      community.tagline ??
      `What's happening, needed, offered, and shared in ${community.name} today.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CommunityLayout,
  errorComponent: () => (
    <AppShell>
      <PageContainer>
        <ErrorState title="This community board didn't load" />
      </PageContainer>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <PageContainer>
        <h1 className="text-3xl">No such community</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          We couldn't find that community board. Check the link, or{" "}
          <Link to="/" className="underline underline-offset-4">
            start from the home page
          </Link>
          .
        </p>
      </PageContainer>
    </AppShell>
  ),
});

function CommunityLayout() {
  const { slug } = Route.useParams();
  const { data: community } = useSuspenseQuery(neighborhoodQuery(slug));

  if (!community) return null;

  return (
    <AppShell>
      <PageContainer>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              {community.name}
            </h1>
            <p className="mt-2 text-sm uppercase tracking-[0.16em] text-muted-foreground">
              {placeLine(community)}
            </p>
            {community.tagline ? (
              <p className="mt-3 max-w-prose text-base text-muted-foreground">
                {community.tagline}
              </p>
            ) : null}
          </div>
          <PostToCommunity slug={community.slug} name={community.name} />
        </header>

        <div className="pt-6">
          <Outlet />
        </div>
      </PageContainer>
    </AppShell>
  );
}
