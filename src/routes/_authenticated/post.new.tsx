import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import {
  PostForm,
  emptyPostForm,
  toPostPayload,
  type PostFormValues,
} from "@/components/posts/post-form";
import { neighborhoodsQuery } from "@/features/neighborhoods/queries";
import type { PostType } from "@/features/neighborhoods/types";
import { createPost } from "@/features/posts/post.functions";
import { useSession } from "@/hooks/use-session";

const POST_TYPES: PostType[] = ["bulletin", "plan", "marketplace", "volunteer"];

export const Route = createFileRoute("/_authenticated/post/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    n: typeof search["n"] === "string" ? search["n"] : undefined,
    type: POST_TYPES.includes(search["type"] as PostType)
      ? (search["type"] as PostType)
      : ("bulletin" as PostType),
    returnTo:
      typeof search["returnTo"] === "string" && search["returnTo"].startsWith("/")
        ? search["returnTo"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New post — Neighborhood Today" },
      {
        name: "description",
        content:
          "Publish a plan, a marketplace listing or a volunteer ask to your neighborhood board.",
      },
      { property: "og:title", content: "New post — Neighborhood Today" },
      {
        property: "og:description",
        content:
          "Publish a plan, a marketplace listing or a volunteer ask to your neighborhood board.",
      },
    ],
  }),
  component: NewPostPage,
  errorComponent: () => (
    <AppShell>
      <PageContainer>
        <ErrorState title="The post form didn't load" />
      </PageContainer>
    </AppShell>
  ),
});

function NewPostPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { data: neighborhoods } = useSuspenseQuery(neighborhoodsQuery());

  const initialNeighborhood =
    neighborhoods.find((neighborhood) => neighborhood.slug === search.n)?.id ??
    neighborhoods[0]?.id ??
    "";

  const [values, setValues] = useState<PostFormValues>(() =>
    emptyPostForm(initialNeighborhood, search.type),
  );

  const mutation = useMutation({
    mutationFn: () => createPost({ data: toPostPayload(values) }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["neighborhood"] });
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      toast.success("Posted to the board.");
      if (result.slug) {
        navigate({ to: "/$slug/p/$postId", params: { slug: result.slug, postId: result.id } });
      } else {
        navigate({ to: "/posts" });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "That post couldn't be published.");
    },
  });

  return (
    <AppShell>
      <PageContainer>
        <h1 className="text-3xl">New post</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Everything here is visible to anyone who visits the board, so keep addresses and phone
          numbers out of the details unless you want them public.
        </p>

        <div className="mt-8">
          {session ? (
            <PostForm
              userId={session.user.id}
              neighborhoods={neighborhoods}
              values={values}
              onChange={setValues}
              onSubmit={() => mutation.mutate()}
              submitting={mutation.isPending}
              submitLabel="Publish post"
            />
          ) : null}
        </div>
      </PageContainer>
    </AppShell>
  );
}
