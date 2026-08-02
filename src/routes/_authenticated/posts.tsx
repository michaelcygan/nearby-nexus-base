import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { PostListSkeleton } from "@/components/common/post-list-skeleton";
import { Button } from "@/components/ui/button";
import { postTypeLabels } from "@/features/neighborhoods/types";
import { deleteMyPost, setMyPostStatus } from "@/features/posts/post.functions";
import { myPostsQuery } from "@/features/posts/queries";

export const Route = createFileRoute("/_authenticated/posts")({
  head: () => ({
    meta: [
      { title: "Your posts — Neighborhood Today" },
      {
        name: "description",
        content: "Manage the plans, listings and volunteer asks you published to your boards.",
      },
      { property: "og:title", content: "Your posts — Neighborhood Today" },
      {
        property: "og:description",
        content: "Manage the plans, listings and volunteer asks you published to your boards.",
      },
    ],
  }),
  component: MyPostsPage,
  errorComponent: () => (
    <AppShell>
      <PageContainer>
        <ErrorState title="Your posts didn't load" />
      </PageContainer>
    </AppShell>
  ),
});

function MyPostsPage() {
  const queryClient = useQueryClient();
  const posts = useQuery(myPostsQuery());

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["my-posts"] });
    queryClient.invalidateQueries({ queryKey: ["neighborhood"] });
  }

  const complete = useMutation({
    mutationFn: (input: { postId: string; status: "active" | "completed" }) =>
      setMyPostStatus({ data: input }),
    onSuccess: () => {
      refresh();
      toast.success("Post updated.");
    },
    onError: () => toast.error("That change didn't go through."),
  });

  const remove = useMutation({
    mutationFn: (postId: string) => deleteMyPost({ data: { postId } }),
    onSuccess: () => {
      refresh();
      toast.success("Post removed.");
    },
    onError: () => toast.error("That post couldn't be removed."),
  });

  return (
    <AppShell>
      <PageContainer>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl">Your posts</h1>
          <Button asChild size="sm">
            <Link to="/post/new" search={{ n: undefined, type: "plan" }}>
              New post
            </Link>
          </Button>
        </div>

        {posts.isLoading ? (
          <div className="mt-8">
            <PostListSkeleton />
          </div>
        ) : null}

        {posts.data && posts.data.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Nothing published yet"
              description="Post a plan, list something for sale, or ask for a hand from neighbors."
            />
          </div>
        ) : null}

        <ul className="mt-8 space-y-3">
          {(posts.data ?? []).map((post) => (
            <li key={post.id} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    {postTypeLabels[post.type]}
                    {post.neighborhood ? ` · ${post.neighborhood.name}` : ""}
                    {post.status !== "active" ? ` · ${post.status}` : ""}
                  </p>
                  <h2 className="mt-1.5 font-display text-lg font-semibold leading-snug">
                    {post.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
                </div>
                {post.image_urls[0] ? (
                  <img
                    src={post.image_urls[0]}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 rounded-sm border border-border object-cover"
                  />
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {post.neighborhood ? (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/$slug/p/$postId"
                      params={{ slug: post.neighborhood.slug, postId: post.id }}
                    >
                      View
                    </Link>
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="outline">
                  <Link to="/post/$postId/edit" params={{ postId: post.id }}>
                    Edit
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={complete.isPending}
                  onClick={() =>
                    complete.mutate({
                      postId: post.id,
                      status: post.status === "active" ? "completed" : "active",
                    })
                  }
                >
                  {post.status === "active" ? "Mark completed" : "Reopen"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(post.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </PageContainer>
    </AppShell>
  );
}
