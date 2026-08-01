import { Link } from "@tanstack/react-router";

import {
  formatDate,
  formatDateTime,
  formatPrice,
  postTypeLabels,
  type PostSummary,
} from "@/features/neighborhoods/types";

function metaFor(post: PostSummary) {
  if (post.type === "plan") {
    return [
      formatDateTime(post.starts_at),
      post.location,
      post.capacity
        ? `${post.going_count} of ${post.capacity} spots taken`
        : post.going_count > 0
          ? `${post.going_count} going`
          : null,
    ];
  }
  if (post.type === "marketplace") {
    return [
      formatPrice(post.price_cents, post.is_free),
      post.condition,
      post.interested_count > 0 ? `${post.interested_count} interested` : null,
    ];
  }
  return [
    post.needed_by ? `Needed by ${formatDate(post.needed_by)}` : null,
    post.slots
      ? `${post.volunteer_count} of ${post.slots} helpers`
      : post.volunteer_count > 0
        ? `${post.volunteer_count} helping`
        : null,
  ];
}

export function PostCard({ post, slug }: { post: PostSummary; slug: string }) {
  const meta = metaFor(post).filter(Boolean) as string[];

  return (
    <li className="rounded-md border border-border bg-card transition-colors hover:border-primary/50">
      <Link
        to="/n/$slug/p/$postId"
        params={{ slug, postId: post.id }}
        className="block rounded-md p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {postTypeLabels[post.type]}
        </p>
        {post.image_urls?.[0] ? (
          <img
            src={post.image_urls[0]}
            alt=""
            loading="lazy"
            className="mt-3 h-40 w-full rounded-sm border border-border object-cover"
          />
        ) : null}
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{post.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
        {meta.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">{meta.join(" · ")}</p>
        ) : null}
      </Link>
    </li>
  );
}
