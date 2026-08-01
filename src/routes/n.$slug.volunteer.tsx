import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { PostFeed } from "@/components/neighborhood/post-feed";
import { neighborhoodPostsQuery } from "@/features/neighborhoods/queries";

export const Route = createFileRoute("/n/$slug/volunteer")({
  loader: ({ params, context }) => {
    context.queryClient.ensureQueryData(neighborhoodPostsQuery(params.slug, "volunteer"));
  },
  head: () => ({
    meta: [
      { title: "Volunteer — Neighborhood Today" },
      {
        name: "description",
        content: "Small asks that need a hand, and neighbors willing to give one.",
      },
      { property: "og:title", content: "Volunteer — Neighborhood Today" },
      {
        property: "og:description",
        content: "Small asks that need a hand, and neighbors willing to give one.",
      },
    ],
  }),
  component: Volunteer,
  errorComponent: () => <ErrorState title="Volunteer needs didn't load" />,
});

function Volunteer() {
  const { slug } = Route.useParams();
  return (
    <PostFeed
      slug={slug}
      type="volunteer"
      heading="Volunteer"
      intro="Specific, finite asks. A ride, an hour, a pair of hands."
      emptyTitle="No open asks"
      emptyDescription="When someone needs a hand here, it shows up on this page."
    />
  );
}
