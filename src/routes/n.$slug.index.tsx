import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PostListSkeleton } from "@/components/common/post-list-skeleton";
import { PostCard } from "@/components/neighborhood/post-card";
import {
  neighborhoodCountsQuery,
  neighborhoodPostsQuery,
  neighborhoodQuery,
} from "@/features/neighborhoods/queries";
import { canonicalUrl } from "@/lib/seo";

export const Route = createFileRoute("/n/$slug/")({
  loader: ({ params, context }) => {
    context.queryClient.ensureQueryData(neighborhoodPostsQuery(params.slug, null, 6));
    context.queryClient.ensureQueryData(neighborhoodCountsQuery(params.slug));
  },
  head: ({ params }) => ({
    links: [{ rel: "canonical", href: canonicalUrl(`/n/${params.slug}`) }],
    meta: [{ property: "og:url", content: canonicalUrl(`/n/${params.slug}`) }],
  }),
  component: Overview,
  errorComponent: () => <ErrorState title="The overview didn't load" />,
  notFoundComponent: () => <EmptyState title="Nothing here yet" />,
});


function Overview() {
  const { slug } = Route.useParams();

  return (
    <div className="space-y-10">
      <Suspense fallback={<PostListSkeleton count={2} />}>
        <About slug={slug} />
      </Suspense>
      <section>
        <h2 className="text-xl">Latest on the board</h2>
        <Suspense fallback={<div className="mt-4"><PostListSkeleton /></div>}>
          <Latest slug={slug} />
        </Suspense>
      </section>
    </div>
  );
}

function About({ slug }: { slug: string }) {
  const { data: neighborhood } = useSuspenseQuery(neighborhoodQuery(slug));
  const { data: counts } = useSuspenseQuery(neighborhoodCountsQuery(slug));

  const summary = [
    { label: "Plans", value: counts.plan, to: "/n/$slug/plans" as const },
    { label: "For sale", value: counts.marketplace, to: "/n/$slug/marketplace" as const },
    { label: "Volunteer", value: counts.volunteer, to: "/n/$slug/volunteer" as const },
    { label: "Directory", value: counts.places, to: "/n/$slug/directory" as const },
  ];

  return (
    <section>
      {neighborhood?.about ? (
        <p className="max-w-prose text-base text-muted-foreground">{neighborhood.about}</p>
      ) : null}
      <ul className="mt-6 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
        {summary.map((item) => (
          <li key={item.label} className="bg-card">
            <Link
              to={item.to}
              params={{ slug }}
              className="block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="font-display text-2xl font-semibold">{item.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {item.label}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Latest({ slug }: { slug: string }) {
  const { data: posts } = useSuspenseQuery(neighborhoodPostsQuery(slug, null, 6));

  if (posts.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          title="The board is empty"
          description="Nothing has been posted in this neighborhood yet."
        />
      </div>
    );
  }

  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} slug={slug} />
      ))}
    </ul>
  );
}
