import { createFileRoute } from "@tanstack/react-router";

import { canonicalUrl } from "@/lib/seo";

import { ErrorState } from "@/components/common/error-state";
import { PostFeed } from "@/components/neighborhood/post-feed";
import { neighborhoodPostsQuery } from "@/features/neighborhoods/queries";

export const Route = createFileRoute("/n/$slug/plans")({
  loader: ({ params, context }) => {
    context.queryClient.ensureQueryData(neighborhoodPostsQuery(params.slug, "plan"));
  },
  head: ({ params }) => ({
    links: [{ rel: "canonical", href: canonicalUrl(`/n/${params.slug}/plans`) }],
    meta: [
      { title: "Plans — Neighborhood Today" },
      {
        name: "description",
        content: "Cleanups, run clubs, porch swaps and everything else neighbors are planning.",
      },
      { property: "og:title", content: "Plans — Neighborhood Today" },
      {
        property: "og:description",
        content: "Cleanups, run clubs, porch swaps and everything else neighbors are planning.",
      },
      { property: "og:url", content: canonicalUrl(`/n/${params.slug}/plans`) },
    ],
  }),
  component: Plans,
  errorComponent: () => <ErrorState title="Plans didn't load" />,
});

function Plans() {
  const { slug } = Route.useParams();
  return (
    <PostFeed
      slug={slug}
      type="plan"
      heading="Plans"
      intro="Things happening soon, posted by people who live here."
      emptyTitle="No plans posted yet"
      emptyDescription="When a neighbor organizes something, it shows up here."
    />
  );
}
