import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { PostFeed } from "@/components/neighborhood/post-feed";
import { neighborhoodPostsQuery } from "@/features/neighborhoods/queries";

export const Route = createFileRoute("/n/$slug/marketplace")({
  loader: ({ params, context }) => {
    context.queryClient.ensureQueryData(neighborhoodPostsQuery(params.slug, "marketplace"));
  },
  head: () => ({
    meta: [
      { title: "Marketplace — Neighborhood Today" },
      {
        name: "description",
        content: "Things for sale, lent, or given away by neighbors a few doors down.",
      },
      { property: "og:title", content: "Marketplace — Neighborhood Today" },
      {
        property: "og:description",
        content: "Things for sale, lent, or given away by neighbors a few doors down.",
      },
    ],
  }),
  component: Marketplace,
  errorComponent: () => <ErrorState title="The marketplace didn't load" />,
});

function Marketplace() {
  const { slug } = Route.useParams();
  return (
    <PostFeed
      slug={slug}
      type="marketplace"
      heading="Marketplace"
      intro="Sold, lent, or given away between neighbors. No shipping, no bidding."
      emptyTitle="Nothing for sale right now"
      emptyDescription="Listings from this neighborhood will appear here."
    />
  );
}
