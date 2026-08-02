import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PostDetail } from "@/features/neighborhoods/types";
import { startThread } from "@/features/messages/thread.functions";
import { joinPost, leavePost } from "@/features/participation/participation.functions";
import {
  myParticipationForPostQuery,
  postParticipantsQuery,
} from "@/features/participation/queries";
import { roleForPostType, roleLabels } from "@/features/participation/types";
import { useSession } from "@/hooks/use-session";

/** Bulletin posts have no sign-up, so they show no participation count. */
function spotsLine(post: PostDetail) {
  if (post.type === "bulletin") return null;
  if (post.type === "plan") {
    if (post.capacity) return `${post.going_count} of ${post.capacity} spots taken`;
    return post.going_count === 1 ? "1 neighbor going" : `${post.going_count} neighbors going`;
  }
  if (post.type === "volunteer") {
    if (post.slots) return `${post.volunteer_count} of ${post.slots} helpers signed up`;
    return post.volunteer_count === 1
      ? "1 helper signed up"
      : `${post.volunteer_count} helpers signed up`;
  }
  return post.interested_count === 1
    ? "1 neighbor interested"
    : `${post.interested_count} neighbors interested`;
}

function isFull(post: PostDetail) {
  if (post.type === "plan" && post.capacity) return post.going_count >= post.capacity;
  if (post.type === "volunteer" && post.slots) return post.volunteer_count >= post.slots;
  return false;
}

export function ParticipationBlock({ post }: { post: PostDetail }) {
  const { session, loading } = useSession();
  const signedIn = Boolean(session);
  const isAuthor = Boolean(session && post.author_id && session.user.id === post.author_id);

  return (
    <section className="mt-8 rounded-md border border-border bg-card p-5">
      <h3 className="font-display text-base font-semibold">
        {post.type === "bulletin"
          ? "Reach out"
          : post.type === "marketplace"
            ? "Interested?"
            : "Join in"}
      </h3>
      {spotsLine(post) ? (
        <p className="mt-1 text-sm text-muted-foreground">{spotsLine(post)}</p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Send the author a private message about this post.
        </p>
      )}

      {loading ? (
        <div className="mt-4 h-9" aria-hidden />
      ) : !signedIn ? (
        <div className="mt-4">
          <Button asChild size="sm" variant="outline">
            <Link to="/auth">
              {post.type === "marketplace" || post.type === "bulletin"
                ? "Sign in to message"
                : "Sign in to join"}
            </Link>
          </Button>
        </div>
      ) : isAuthor ? (
        <AuthorParticipants postId={post.id} />
      ) : post.type === "marketplace" || post.type === "bulletin" ? (
        <MessageAuthorForm post={post} />
      ) : (
        <JoinControls post={post} />
      )}
    </section>
  );
}

function JoinControls({ post }: { post: PostDetail }) {
  const queryClient = useQueryClient();
  const mine = useQuery(myParticipationForPostQuery(post.id));
  const role = roleForPostType(post.type);
  const joined = Boolean(mine.data);
  const full = isFull(post);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["participation"] });
    queryClient.invalidateQueries({ queryKey: ["post", post.id] });
    queryClient.invalidateQueries({ queryKey: ["neighborhood"] });
  }

  const join = useMutation({
    mutationFn: () => joinPost({ data: { postId: post.id, role } }),
    onSuccess: () => {
      toast.success(post.type === "plan" ? "You're on the list." : "Thanks for helping out.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const leave = useMutation({
    mutationFn: () => leavePost({ data: { postId: post.id } }),
    onSuccess: () => {
      toast.success("Taken off the list.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (post.status !== "active") {
    return <p className="mt-4 text-sm text-muted-foreground">This post is closed to sign-ups.</p>;
  }

  if (mine.isLoading) return <div className="mt-4 h-9" aria-hidden />;

  if (joined) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-sm border border-primary/40 px-2 py-1 text-xs uppercase tracking-[0.12em] text-primary">
          {roleLabels[role]}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={leave.isPending}
          onClick={() => leave.mutate()}
        >
          {post.type === "plan" ? "Can't make it" : "Give up my slot"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Button size="sm" disabled={full || join.isPending} onClick={() => join.mutate()}>
        {full ? "Full for now" : post.type === "plan" ? "I'm going" : "Claim a slot"}
      </Button>
    </div>
  );
}

function MessageAuthorForm({ post }: { post: PostDetail }) {
  const navigate = useNavigate();
  const [body, setBody] = useState("");

  const start = useMutation({
    mutationFn: () => startThread({ data: { postId: post.id, body } }),
    onSuccess: (result) => {
      setBody("");
      navigate({ to: "/messages/$threadId", params: { threadId: result.threadId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim()) {
          toast.error("Write a message first.");
          return;
        }
        start.mutate();
      }}
    >
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={
          post.type === "marketplace"
            ? "Is this still available? I could pick it up this weekend."
            : "Say hello, or ask the author a question."
        }
        aria-label="Private message to the author"
      />
      <Button type="submit" size="sm" disabled={start.isPending}>
        {start.isPending
          ? "Sending…"
          : post.type === "marketplace"
            ? "Message the seller"
            : "Reach out"}
      </Button>
    </form>
  );
}

function AuthorParticipants({ postId }: { postId: string }) {
  const participants = useQuery(postParticipantsQuery(postId));

  if (participants.isLoading) return <div className="mt-4 h-9" aria-hidden />;

  if (!participants.data?.length) {
    return <p className="mt-4 text-sm text-muted-foreground">No sign-ups yet.</p>;
  }

  return (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
        Who signed up (only you can see this)
      </p>
      <ul className="mt-2 space-y-2 text-sm">
        {participants.data.map((participant) => (
          <li key={participant.id} className="flex flex-wrap items-baseline gap-2">
            <Link
              to="/u/$profileId"
              params={{ profileId: participant.user_id }}
              className="font-medium underline underline-offset-4"
            >
              {participant.display_name}
            </Link>
            <span className="text-xs text-muted-foreground">{roleLabels[participant.role]}</span>
            {participant.note ? (
              <span className="text-xs text-muted-foreground">— {participant.note}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
