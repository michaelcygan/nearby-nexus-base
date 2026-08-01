import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import {
  PostForm,
  emptyPostForm,
  toPostPayload,
  type PostFormValues,
} from "@/components/posts/post-form";
import { neighborhoodsQuery } from "@/features/neighborhoods/queries";
import { updateMyPost } from "@/features/posts/post.functions";
import { myPostQuery } from "@/features/posts/queries";
import { useSession } from "@/hooks/use-session";

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export const Route = createFileRoute("/_authenticated/post/$postId/edit")({
  head: () => ({
    meta: [
      { title: "Edit post — Neighborhood Today" },
      { name: "description", content: "Update or correct a post you published to your board." },
      { property: "og:title", content: "Edit post — Neighborhood Today" },
      {
        property: "og:description",
        content: "Update or correct a post you published to your board.",
      },
    ],
  }),
  component: EditPostPage,
  errorComponent: () => (
    <AppShell>
      <PageContainer>
        <ErrorState title="That post didn't load" />
      </PageContainer>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <PageContainer>
        <EmptyState title="Post not found" description="It may have been removed already." />
      </PageContainer>
    </AppShell>
  ),
});

function EditPostPage() {
  const { postId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { data: neighborhoods } = useSuspenseQuery(neighborhoodsQuery());
  const { data: post } = useSuspenseQuery(myPostQuery(postId));
  const [values, setValues] = useState<PostFormValues | null>(null);

  useEffect(() => {
    if (!post || values) return;
    setValues({
      ...emptyPostForm(post.neighborhood_id, post.type),
      title: post.title,
      body: post.body,
      starts_at: toLocalInput(post.starts_at),
      location: post.location ?? "",
      capacity: post.capacity ? String(post.capacity) : "",
      price: post.price_cents && !post.is_free ? String(post.price_cents / 100) : "",
      is_free: Boolean(post.is_free),
      condition: post.condition ?? "",
      needed_by: toLocalInput(post.needed_by),
      slots: post.slots ? String(post.slots) : "",
      images: (post.image_paths ?? []).map((path, index) => ({
        path,
        url: post.image_urls[index] ?? "",
      })),
    });
  }, [post, values]);

  const mutation = useMutation({
    mutationFn: () => updateMyPost({ data: { postId, values: toPostPayload(values!) } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["neighborhood"] });
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      toast.success("Post updated.");
      if (result.slug) {
        navigate({ to: "/n/$slug/p/$postId", params: { slug: result.slug, postId } });
      } else {
        navigate({ to: "/posts" });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "That post couldn't be updated.");
    },
  });

  if (!post) {
    return (
      <AppShell>
        <PageContainer>
          <EmptyState
            title="Post not found"
            description="You can only edit posts you published yourself."
          />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer>
        <h1 className="text-3xl">Edit post</h1>
        <div className="mt-8">
          {session && values ? (
            <PostForm
              userId={session.user.id}
              neighborhoods={neighborhoods}
              values={values}
              onChange={setValues}
              onSubmit={() => mutation.mutate()}
              submitting={mutation.isPending}
              submitLabel="Save changes"
              lockType
            />
          ) : null}
        </div>
      </PageContainer>
    </AppShell>
  );
}
