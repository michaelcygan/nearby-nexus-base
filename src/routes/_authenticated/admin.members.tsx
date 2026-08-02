import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setMemberModerator } from "@/features/moderation/moderation.functions";
import { memberSearchQuery, myModerationRoleQuery } from "@/features/moderation/queries";

export const Route = createFileRoute("/_authenticated/admin/members")({
  head: () => ({
    meta: [
      { title: "Members and roles — Neighborhood Today" },
      { name: "description", content: "Grant or revoke the moderator role for neighbors." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MembersPage,
  errorComponent: () => (
    <AppShell>
      <PageContainer>
        <ErrorState title="The member list didn't load" />
      </PageContainer>
    </AppShell>
  ),
});

function MembersPage() {
  const role = useQuery(myModerationRoleQuery());
  const [term, setTerm] = useState("");
  const queryClient = useQueryClient();
  const members = useQuery({
    ...memberSearchQuery(term),
    enabled: role.data?.isAdmin === true,
  });

  const setModerator = useMutation({
    mutationFn: (input: { userId: string; grant: boolean }) => setMemberModerator({ data: input }),
    onSuccess: (result) => {
      toast.success(result.grant ? "Moderator role granted." : "Moderator role revoked.");
      void queryClient.invalidateQueries({ queryKey: ["moderation"] });
    },
    onError: (error: Error) => toast.error(error.message || "That change didn't go through."),
  });

  if (role.isLoading) {
    return (
      <AppShell>
        <PageContainer>
          <p className="text-sm text-muted-foreground">Checking your access…</p>
        </PageContainer>
      </AppShell>
    );
  }

  if (!role.data?.isAdmin) {
    return (
      <AppShell>
        <PageContainer>
          <h1 className="text-3xl">Admins only</h1>
          <p className="mt-3 max-w-prose text-muted-foreground">
            Role changes are limited to neighborhood admins.
          </p>
          <p className="mt-4 text-sm">
            <Link to="/" className="underline underline-offset-4">
              Back to the front page
            </Link>
          </p>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer>
        <h1 className="text-3xl">Members and roles</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Moderators can review reports and hide or remove content. They can't change roles — only
          admins can do that.
        </p>

        <div className="mt-6 max-w-sm">
          <Input
            value={term}
            maxLength={60}
            placeholder="Search by display name"
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>

        {members.data?.length ? (
          <ul className="mt-6 divide-y divide-border rounded-md border border-border bg-card">
            {members.data.map((member) => {
              const isModerator = member.roles.includes("moderator");
              const isAdmin = member.roles.includes("admin");
              return (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <Link
                      to="/u/$profileId"
                      params={{ profileId: member.id }}
                      className="font-display text-base font-semibold underline underline-offset-4"
                    >
                      {member.display_name}
                    </Link>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      {isAdmin ? "Admin" : isModerator ? "Moderator" : "Member"}
                    </p>
                  </div>
                  {isAdmin ? (
                    <span className="text-xs text-muted-foreground">
                      Admins already have full access
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={isModerator ? "outline" : "default"}
                      disabled={setModerator.isPending}
                      onClick={() =>
                        setModerator.mutate({ userId: member.id, grant: !isModerator })
                      }
                    >
                      {isModerator ? "Revoke moderator" : "Make moderator"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            {members.isLoading ? "Loading members…" : "No members matched that search."}
          </p>
        )}
      </PageContainer>
    </AppShell>
  );
}
