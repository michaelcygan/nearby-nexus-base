import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { threadQuery } from "@/features/messages/queries";
import { markThreadRead, sendMessage } from "@/features/messages/thread.functions";

export const Route = createFileRoute("/_authenticated/messages/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversation — Neighborhood Today" },
      { name: "description", content: "A private conversation with a neighbor about one post." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Conversation — Neighborhood Today" },
      {
        property: "og:description",
        content: "A private conversation with a neighbor about one post.",
      },
    ],
  }),
  component: ThreadPage,
  errorComponent: () => <ErrorState title="This conversation didn't load" />,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const queryClient = useQueryClient();
  const thread = useQuery(threadQuery(threadId));
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!thread.data) return;
    void markThreadRead({ data: { threadId } }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    });
  }, [thread.data, threadId, queryClient]);

  const send = useMutation({
    mutationFn: () => sendMessage({ data: { threadId, body } }),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["threads", threadId] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (thread.isLoading) {
    return (
      <AppShell>
        <PageContainer>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-6 h-40 w-full" />
        </PageContainer>
      </AppShell>
    );
  }

  if (!thread.data) {
    return (
      <AppShell>
        <PageContainer>
          <EmptyState
            title="Conversation unavailable"
            description="It may have been removed along with its post."
          />
        </PageContainer>
      </AppShell>
    );
  }

  const detail = thread.data;

  return (
    <AppShell>
      <PageContainer>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <Link to="/messages" className="underline underline-offset-4">
            Messages
          </Link>
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl">{detail.other_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          About{" "}
          {detail.neighborhood_slug ? (
            <Link
              to="/n/$slug/p/$postId"
              params={{ slug: detail.neighborhood_slug, postId: detail.post_id }}
              className="underline underline-offset-4"
            >
              {detail.post_title}
            </Link>
          ) : (
            detail.post_title
          )}
        </p>

        <ul className="mt-6 space-y-3">
          {detail.messages.map((message) => {
            const mine = message.sender_id === detail.viewer_id;
            return (
              <li
                key={message.id}
                className={`max-w-[85%] rounded-md border p-3 text-sm ${
                  mine
                    ? "ml-auto border-primary/40 bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <p className="whitespace-pre-line">{message.body}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {mine ? "You" : detail.other_name} ·{" "}
                  {new Date(message.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            );
          })}
        </ul>

        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!body.trim()) {
              toast.error("Write a message first.");
              return;
            }
            send.mutate();
          }}
        >
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Write a reply…"
            aria-label="Your reply"
          />
          <Button type="submit" size="sm" disabled={send.isPending}>
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </form>
      </PageContainer>
    </AppShell>
  );
}
