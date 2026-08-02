import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { myProfileQuery, mySavedNeighborhoodsQuery } from "@/features/account/queries";
import {
  setMyAvatarPath,
  unsaveNeighborhood,
  updateMyProfile,
} from "@/features/account/profile.functions";
import { initialsFor, profileSchema } from "@/features/account/types";
import { neighborhoodsQuery } from "@/features/neighborhoods/queries";
import { formatTimestamp } from "@/features/neighborhoods/types";

import { myParticipationQuery } from "@/features/participation/queries";
import { roleLabels } from "@/features/participation/types";
import { unblockNeighbor } from "@/features/moderation/block.functions";
import { myBlocksQuery, myReportsQuery } from "@/features/moderation/queries";
import {
  reportReasonLabels,
  reportStatusLabels,
  reportTargetLabels,
} from "@/features/moderation/types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Neighborhood Today" },
      {
        name: "description",
        content: "Update how neighbors see you and manage the neighborhoods you follow.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your profile — Neighborhood Today" },
      {
        property: "og:description",
        content: "Update how neighbors see you and manage the neighborhoods you follow.",
      },
    ],
  }),
  component: ProfilePage,
});

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function ProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const profile = useQuery(myProfileQuery());
  const saved = useQuery(mySavedNeighborhoodsQuery());
  const neighborhoods = useQuery(neighborhoodsQuery());
  const joined = useQuery(myParticipationQuery());

  const [displayName, setDisplayName] = useState("");
  const [about, setAbout] = useState("");
  const [homeId, setHomeId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile.data) return;
    setDisplayName(profile.data.display_name);
    setAbout(profile.data.about ?? "");
    setHomeId(profile.data.home_neighborhood_id ?? "");
  }, [profile.data]);

  const save = useMutation({
    mutationFn: (values: {
      display_name: string;
      about: string;
      home_neighborhood_id: string | null;
    }) => updateMyProfile({ data: values }),
    onSuccess: () => {
      toast.success("Profile saved.");
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Couldn't save your profile."),
  });

  const removeSaved = useMutation({
    mutationFn: (neighborhoodId: string) => unsaveNeighborhood({ data: { neighborhoodId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-saved-neighborhoods"] });
    },
    onError: () => toast.error("Couldn't update your saved neighborhoods."),
  });

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Images need to be under 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You're signed out.");
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      await setMyAvatarPath({ data: { avatar_path: path } });
      toast.success("Photo updated.");
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't upload that photo.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = profileSchema.safeParse({
      display_name: displayName,
      about,
      home_neighborhood_id: homeId ? homeId : null,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    save.mutate({
      display_name: parsed.data.display_name,
      about: parsed.data.about ?? "",
      home_neighborhood_id: parsed.data.home_neighborhood_id ?? null,
    });
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (profile.isError) {
    return (
      <AppShell>
        <PageContainer>
          <ErrorState title="Your profile didn't load" />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Your account
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl">Profile</h1>
            <p className="mt-3 max-w-prose text-sm text-muted-foreground">
              This is how neighbors see you on plans, listings and volunteer posts.
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </header>

        {profile.isPending ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-24 w-full max-w-md" />
          </div>
        ) : (
          <>
            <section className="mt-8 flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {profile.data?.avatar_url ? (
                  <AvatarImage src={profile.data.avatar_url} alt="" />
                ) : null}
                <AvatarFallback>{initialsFor(displayName || "Neighbor")}</AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? "Uploading…" : "Change photo"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">JPG or PNG, up to 2 MB.</p>
              </div>
            </section>

            <form onSubmit={handleSubmit} className="mt-8 max-w-md space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  maxLength={60}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
                {errors["display_name"] ? (
                  <p className="text-sm text-destructive">{errors["display_name"]}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="about">A line about you</Label>
                <Textarea
                  id="about"
                  value={about}
                  maxLength={400}
                  rows={4}
                  placeholder="Ten years on the block, always up for a stoop coffee."
                  onChange={(event) => setAbout(event.target.value)}
                />
                {errors["about"] ? (
                  <p className="text-sm text-destructive">{errors["about"]}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="home-neighborhood">Home neighborhood</Label>
                <select
                  id="home-neighborhood"
                  value={homeId}
                  onChange={(event) => setHomeId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">No home neighborhood yet</option>
                  {(neighborhoods.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}, {item.city}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save profile"}
              </Button>
            </form>

            {profile.data ? (
              <p className="mt-4 text-sm text-muted-foreground">
                <Link
                  to="/u/$profileId"
                  params={{ profileId: profile.data.id }}
                  className="underline underline-offset-4"
                >
                  View your public neighbor page
                </Link>
              </p>
            ) : null}

            <section className="mt-12">
              <h2 className="font-display text-xl">Saved neighborhoods</h2>
              <div className="rule-print my-4" />
              {saved.isPending ? (
                <Skeleton className="h-16 w-full max-w-md" />
              ) : (saved.data ?? []).length === 0 ? (
                <p className="max-w-prose text-sm text-muted-foreground">
                  You haven't saved any neighborhoods yet. Open a board and hit “Save neighborhood”
                  to keep it here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {(saved.data ?? []).map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4"
                    >
                      <Link
                        to="/$slug"
                        params={{ slug: row.neighborhood.slug }}
                        className="font-display text-base underline-offset-4 hover:underline"
                      >
                        {row.neighborhood.name}, {row.neighborhood.city}
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={removeSaved.isPending}
                        onClick={() => removeSaved.mutate(row.neighborhood.id)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-12">
              <h2 className="font-display text-xl">Things you joined</h2>
              <div className="rule-print my-4" />
              {joined.isPending ? (
                <Skeleton className="h-16 w-full max-w-md" />
              ) : (joined.data ?? []).length === 0 ? (
                <p className="max-w-prose text-sm text-muted-foreground">
                  Nothing yet. When you join a plan or claim a volunteer slot, it shows up here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {(joined.data ?? []).map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4"
                    >
                      <div>
                        {row.post ? (
                          <Link
                            to="/$slug/p/$postId"
                            params={{ slug: row.post.neighborhood_slug, postId: row.post.id }}
                            className="font-display text-base underline-offset-4 hover:underline"
                          >
                            {row.post.title}
                          </Link>
                        ) : (
                          <span className="font-display text-base">Post removed</span>
                        )}
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          {roleLabels[row.role]}
                          {row.post?.neighborhood_name ? ` · ${row.post.neighborhood_name}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-12">
              <h2 className="font-display text-xl">Safety</h2>
              <div className="rule-print my-4" />
              <BlockedNeighbors />
              <MyReports />
            </section>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}

function BlockedNeighbors() {
  const queryClient = useQueryClient();
  const blocks = useQuery(myBlocksQuery());

  const unblock = useMutation({
    mutationFn: (neighborId: string) => unblockNeighbor({ data: { neighborId } }),
    onSuccess: () => {
      toast.success("Block removed.");
      void queryClient.invalidateQueries({ queryKey: ["moderation"] });
    },
    onError: () => toast.error("That didn't go through."),
  });

  return (
    <div>
      <h3 className="font-display text-base font-semibold">Neighbors you blocked</h3>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Blocking is private. Their posts stay hidden from your boards and neither of you can start a
        new conversation with the other.
      </p>
      {blocks.isPending ? (
        <Skeleton className="mt-3 h-10 w-full max-w-md" />
      ) : (blocks.data ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">You haven't blocked anyone.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(blocks.data ?? []).map((block) => (
            <li
              key={block.blocked_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3"
            >
              <Link
                to="/u/$profileId"
                params={{ profileId: block.blocked_id }}
                className="font-display text-base underline underline-offset-4"
              >
                {block.display_name}
              </Link>
              <Button
                size="sm"
                variant="outline"
                disabled={unblock.isPending}
                onClick={() => unblock.mutate(block.blocked_id)}
              >
                Unblock
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MyReports() {
  const reports = useQuery(myReportsQuery());

  return (
    <div className="mt-8">
      <h3 className="font-display text-base font-semibold">Reports you filed</h3>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Only you and the moderators can see these.
      </p>
      {reports.isPending ? (
        <Skeleton className="mt-3 h-10 w-full max-w-md" />
      ) : (reports.data ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing reported yet.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {(reports.data ?? []).map((report) => (
            <li key={report.id} className="rounded-md border border-border bg-card p-3">
              <p className="font-display text-base">
                {reportTargetLabels[report.target_type]} · {reportReasonLabels[report.reason]}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {reportStatusLabels[report.status]} · {formatTimestamp(report.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
