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
    return [formatDateTime(post.starts_at), post.location, post.capacity ? `${post.capacity} spots` : null];
  }
  if (post.type === "marketplace") {
    return [formatPrice(post.price_cents, post.is_free), post.condition];
  }
  return [
    post.needed_by ? `Needed by ${formatDate(post.needed_by)}` : null,
    post.slots ? `${post.slots} ${post.slots === 1 ? "person" : "people"} needed` : null,
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
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{post.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
        {meta.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">{meta.join(" · ")}</p>
        ) : null}
      </Link>
    </li>
  );
}
