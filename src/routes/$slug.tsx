import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, notFound } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { PostToCommunity } from "@/components/community/post-to-community";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { neighborhoodQuery } from "@/features/neighborhoods/queries";
import { placeLine } from "@/features/neighborhoods/types";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { communityDescription, communityKeywordsMeta, communitySubareaLine } from "@/lib/seo";

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
    const title = `${community.name} Today — Neighborhood Today`;
    const description = communityDescription(community.slug, community.name, community.city);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        communityKeywordsMeta(community.slug, community.name, community.city),
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
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {placeLine(community)}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              {community.name}
            </h1>
            {communitySubareaLine(community.slug) ? (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
                {communitySubareaLine(community.slug)}
              </p>
            ) : null}
            {community.tagline ? (
              <p className="mt-2 line-clamp-2 max-w-prose text-sm text-muted-foreground sm:text-base">
                {community.tagline}
              </p>
            ) : null}
          </div>
          <PostToCommunity slug={community.slug} name={community.name} size="sm" />
        </header>

        <div className="pt-4">
          <Outlet />
        </div>
      </PageContainer>
    </AppShell>
  );
}
