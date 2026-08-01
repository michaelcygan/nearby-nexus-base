import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/empty-state";
import { ParticipationBlock } from "@/components/posts/participation-block";
import { ErrorState } from "@/components/common/error-state";
import { postQuery } from "@/features/neighborhoods/queries";
import {
  formatDate,
  formatDateTime,
  formatPrice,
  postTypeLabels,
} from "@/features/neighborhoods/types";

export const Route = createFileRoute("/n/$slug/p/$postId")({
  loader: async ({ params, context }) => {
    const post = await context.queryClient.ensureQueryData(postQuery(params.postId));
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Post unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const { post } = loaderData;
    const title = `${post.title} — ${post.neighborhood.name}`;
    const description = post.body.slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: PostDetailPage,
  errorComponent: () => <ErrorState title="This post didn't load" />,
  notFoundComponent: () => (
    <EmptyState
      title="This post is gone"
      description="It may have been removed by its author or by a moderator."
    />
  ),
});

function PostDetailPage() {
  const { slug, postId } = Route.useParams();
  const { data: post } = useSuspenseQuery(postQuery(postId));

  if (!post) {
    return <EmptyState title="This post is gone" />;
  }

  const facts: Array<[string, string]> = [];
  if (post.type === "plan") {
    const when = formatDateTime(post.starts_at);
    if (when) facts.push(["When", when]);
    if (post.location) facts.push(["Where", post.location]);
    if (post.capacity) facts.push(["Spots", String(post.capacity)]);
  }
  if (post.type === "marketplace") {
    const price = formatPrice(post.price_cents, post.is_free);
    if (price) facts.push(["Price", price]);
    if (post.condition) facts.push(["Condition", post.condition]);
  }
  if (post.type === "volunteer") {
    const by = formatDate(post.needed_by);
    if (by) facts.push(["Needed by", by]);
    if (post.slots) facts.push(["People needed", String(post.slots)]);
  }

  return (
    <article className="max-w-2xl">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {postTypeLabels[post.type]}
      </p>
      <h2 className="mt-2 text-2xl sm:text-3xl">{post.title}</h2>
      {post.image_urls.length > 0 ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {post.image_urls.map((url) => (
            <li key={url}>
              <img
                src={url}
                alt={`Photo from ${post.title}`}
                loading="lazy"
                className="w-full rounded-sm border border-border object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}
      {post.status !== "active" ? (
        <p className="mt-3 inline-block rounded-sm border border-border px-2 py-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {post.status}
        </p>
      ) : null}

      {facts.length > 0 ? (
        <dl className="mt-6 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label} className="bg-card p-4">
              <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-1 font-display text-base font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-foreground/90">
        {post.body}
      </div>

      <ParticipationBlock post={post} />

      <p className="mt-8 text-sm">
        <Link
          to="/n/$slug"
          params={{ slug }}
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Back to {post.neighborhood.name}
        </Link>
      </p>
    </article>
  );
}
