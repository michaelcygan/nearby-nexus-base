import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { myThreadsQuery } from "@/features/messages/queries";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({
    meta: [
      { title: "Your messages — Neighborhood Today" },
      {
        name: "description",
        content: "Private conversations with neighbors about plans, listings and volunteer asks.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your messages — Neighborhood Today" },
      {
        property: "og:description",
        content: "Private conversations with neighbors about posts on your boards.",
      },
    ],
  }),
  component: MessagesPage,
  errorComponent: () => <ErrorState title="Your messages didn't load" />,
});

function MessagesPage() {
  const threads = useQuery(myThreadsQuery());

  return (
    <AppShell>
      <PageContainer>
        <h1 className="text-2xl sm:text-3xl">Messages</h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Every conversation is tied to one post and stays between the two of you.
        </p>

        {threads.isLoading ? (
          <div className="mt-8 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !threads.data?.length ? (
          <div className="mt-8">
            <EmptyState
              title="No conversations yet"
              description="When you message a seller or someone replies to your post, it shows up here."
            />
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {threads.data.map((thread) => (
              <li
                key={thread.id}
                className="rounded-md border border-border bg-card transition-colors hover:border-primary/50"
              >
                <Link
                  to="/messages/$threadId"
                  params={{ threadId: thread.id }}
                  className="block rounded-md p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-display text-base font-semibold">{thread.other_name}</p>
                    {thread.unread ? (
                      <span className="rounded-sm bg-primary px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-primary-foreground">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {thread.post_title}
                  </p>
                  {thread.last_message ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {thread.last_message}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </AppShell>
  );
}
