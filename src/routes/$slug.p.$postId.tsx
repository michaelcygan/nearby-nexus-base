import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { BlockButton } from "@/components/moderation/block-button";
import { ReportButton } from "@/components/moderation/report-button";
import { ParticipationBlock } from "@/components/posts/participation-block";
import { postQuery } from "@/features/neighborhoods/queries";
import {
  formatDate,
  formatDateTime,
  formatPrice,
  postTypeBadge,
} from "@/features/neighborhoods/types";
import { canonicalUrl } from "@/lib/seo";

export const Route = createFileRoute("/$slug/p/$postId")({
  loader: async ({ params, context }) => {
    // fetchPostById only resolves a post that belongs to this slug, so a post
    // from another community 404s here instead of rendering.
    const post = await context.queryClient.ensureQueryData(postQuery(params.slug, params.postId));
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Post unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const { post } = loaderData;
    const title = `${post.title} — ${post.neighborhood.name}`;
    const description = post.body.slice(0, 155);
    const href = canonicalUrl(`/${params.slug}/p/${params.postId}`);
    return {
      links: [{ rel: "canonical", href }],
      meta: [
        { title },
        { property: "og:url", content: href },
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
  const { data: post } = useSuspenseQuery(postQuery(slug, postId));

  if (!post) {
    return <EmptyState title="This post is gone" />;
  }

  const timeZone = post.neighborhood.timezone;
  const facts: Array<[string, string]> = [];
  if (post.type === "plan") {
    const when = formatDateTime(post.starts_at, timeZone);
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
    const by = formatDate(post.needed_by, timeZone);
    if (by) facts.push(["Needed by", by]);
    if (post.slots) facts.push(["People needed", String(post.slots)]);
  }

  return (
    <article className="max-w-2xl">
      {postTypeBadge(post.type) ? (
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {postTypeBadge(post.type)}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl sm:text-3xl">{post.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Posted by {post.author_name ?? "a neighbor"}
      </p>
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
              <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-display text-base font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-foreground/90">
        {post.body}
      </div>

      <ParticipationBlock post={post} />

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <ReportButton targetType="post" targetId={post.id} />
        {post.author_id ? <BlockButton neighborId={post.author_id} /> : null}
      </div>

      <p className="mt-6 text-sm">
        <Link
          to="/$slug"
          params={{ slug }}
          search={{ view: "today" as const }}
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Back to {post.neighborhood.name}
        </Link>
      </p>
    </article>
  );
}
