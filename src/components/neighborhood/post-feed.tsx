import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PostListSkeleton } from "@/components/common/post-list-skeleton";
import { PostCard } from "@/components/neighborhood/post-card";
import { PostCta } from "@/components/posts/post-cta";
import { neighborhoodPostsQuery } from "@/features/neighborhoods/queries";
import type { PostType } from "@/features/neighborhoods/types";

export function PostFeed({
  slug,
  type,
  heading,
  intro,
  emptyTitle,
  emptyDescription,
}: {
  slug: string;
  type: PostType;
  heading: string;
  intro: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">{heading}</h2>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">{intro}</p>
        </div>
        <PostCta slug={slug} type={type} />
      </div>
      <Suspense
        fallback={
          <div className="mt-5">
            <PostListSkeleton />
          </div>
        }
      >
        <FeedList
          slug={slug}
          type={type}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </Suspense>
    </section>
  );
}

function FeedList({
  slug,
  type,
  emptyTitle,
  emptyDescription,
}: {
  slug: string;
  type: PostType;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { data: posts } = useSuspenseQuery(neighborhoodPostsQuery(slug, type));

  if (posts.length === 0) {
    return (
      <div className="mt-5">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} slug={slug} />
      ))}
    </ul>
  );
}
