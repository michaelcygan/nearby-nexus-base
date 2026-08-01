import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actOnReport } from "@/features/moderation/moderation.functions";
import { formatTimestamp } from "@/features/neighborhoods/types";
import {
  moderationLogQuery,
  myModerationRoleQuery,
  reportQueueQuery,
} from "@/features/moderation/queries";
import {
  moderationActionLabels,
  reportReasonLabels,
  reportStatusLabels,
  reportTargetLabels,
} from "@/features/moderation/types";
import type { ReportStatus } from "@/features/moderation/types";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation queue — Neighborhood Today" },
      {
        name: "description",
        content: "Review reported posts, listings and neighbors, and act on them.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ModerationPage,
  errorComponent: () => (
    <AppShell>
      <PageContainer>
        <ErrorState title="The moderation queue didn't load" />
      </PageContainer>
    </AppShell>
  ),
});

const statuses: ReportStatus[] = ["open", "actioned", "dismissed"];

function ModerationPage() {
  const role = useQuery(myModerationRoleQuery());
  const [status, setStatus] = useState<ReportStatus>("open");

  if (role.isLoading) {
    return (
      <AppShell>
        <PageContainer>
          <p className="text-sm text-muted-foreground">Checking your access…</p>
        </PageContainer>
      </AppShell>
    );
  }

  if (!role.data?.canModerate) {
    return (
      <AppShell>
        <PageContainer>
          <h1 className="text-3xl">Moderators only</h1>
          <p className="mt-3 max-w-prose text-muted-foreground">
            This queue is for neighborhood moderators. If something needs attention, use the report
            button on the post, listing or neighbor page.
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
        <h1 className="text-3xl">Moderation</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Reports neighbors filed, newest first. Hiding pulls something off the public boards but
          keeps it for review; removing takes it down for good. Every action is logged.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {statuses.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? "default" : "outline"}
              onClick={() => setStatus(value)}
            >
              {reportStatusLabels[value]}
            </Button>
          ))}
        </div>

        <ReportQueue status={status} />

        <div className="rule-print my-10" />
        <ModerationLog />
      </PageContainer>
    </AppShell>
  );
}

function ReportQueue({ status }: { status: ReportStatus }) {
  const queryClient = useQueryClient();
  const reports = useQuery(reportQueueQuery(status));
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const act = useMutation({
    mutationFn: (input: {
      reportId: string;
      action: "dismiss" | "hide" | "remove" | "restore";
    }) =>
      actOnReport({
        data: {
          reportId: input.reportId,
          action: input.action,
          reason: reasons[input.reportId] ?? "",
        },
      }),
    onSuccess: (result) => {
      toast.success(`${moderationActionLabels[result.action]}.`);
      void queryClient.invalidateQueries({ queryKey: ["moderation"] });
      void queryClient.invalidateQueries({ queryKey: ["neighborhood-posts"] });
    },
    onError: (error: Error) => toast.error(error.message || "That action didn't go through."),
  });

  if (reports.isLoading) {
    return <p className="mt-6 text-sm text-muted-foreground">Loading reports…</p>;
  }

  if (!reports.data?.length) {
    return (
      <div className="mt-6">
        <EmptyState
          title={status === "open" ? "Nothing waiting" : "Nothing here"}
          description={
            status === "open"
              ? "No open reports right now. That's a good sign."
              : "No reports with this status yet."
          }
        />
      </div>
    );
  }

  return (
    <ul className="mt-6 space-y-4">
      {reports.data.map((report) => (
        <li key={report.id} className="rounded-md border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {reportTargetLabels[report.target_type]} · {reportReasonLabels[report.reason]}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTimestamp(report.created_at)}
            </p>
          </div>

          <h2 className="mt-2 font-display text-lg font-semibold">{report.preview.title}</h2>
          {report.preview.detail ? (
            <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
              {report.preview.detail}
            </p>
          ) : null}

          {report.note ? (
            <p className="mt-3 border-l-2 border-border pl-3 text-sm">
              <span className="text-muted-foreground">Reporter said: </span>
              {report.note}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {report.preview.link ? (
              <Link
                to="/n/$slug/p/$postId"
                params={{
                  slug: report.preview.link.slug,
                  postId: report.preview.link.postId,
                }}
                className="underline underline-offset-4"
              >
                Open post
              </Link>
            ) : null}
            {report.preview.placeLink ? (
              <Link
                to="/n/$slug/place/$placeId"
                params={{
                  slug: report.preview.placeLink.slug,
                  placeId: report.preview.placeLink.placeId,
                }}
                className="underline underline-offset-4"
              >
                Open listing
              </Link>
            ) : null}
            {report.preview.profileId ? (
              <Link
                to="/u/$profileId"
                params={{ profileId: report.preview.profileId }}
                className="underline underline-offset-4"
              >
                Open neighbor page
              </Link>
            ) : null}
            {report.preview.hidden ? (
              <span className="text-muted-foreground">Currently hidden</span>
            ) : null}
            {report.preview.removed ? (
              <span className="text-muted-foreground">Removed</span>
            ) : null}
          </div>

          {status === "open" ? (
            <div className="mt-4 space-y-3">
              <Input
                value={reasons[report.id] ?? ""}
                maxLength={300}
                placeholder="Note for the log (optional)"
                onChange={(event) =>
                  setReasons((current) => ({ ...current, [report.id]: event.target.value }))
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={act.isPending}
                  onClick={() => act.mutate({ reportId: report.id, action: "dismiss" })}
                >
                  Dismiss
                </Button>
                {report.target_type === "post" || report.target_type === "place" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ reportId: report.id, action: "hide" })}
                    >
                      Hide
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ reportId: report.id, action: "remove" })}
                    >
                      Remove
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ reportId: report.id, action: "restore" })}
                    >
                      Restore
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ModerationLog() {
  const log = useQuery(moderationLogQuery());

  return (
    <section>
      <h2 className="text-xl">Action log</h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        The last 50 moderator actions, with who took them.
      </p>
      {log.data?.length ? (
        <ul className="mt-4 space-y-2 text-sm">
          {log.data.map((entry) => (
            <li key={entry.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
              <span className="text-foreground">
                {moderationActionLabels[entry.action]} a{" "}
                {reportTargetLabels[entry.target_type].toLowerCase()}
              </span>
              <span>by {entry.actor_name}</span>
              <span>· {formatTimestamp(entry.created_at)}</span>
              {entry.reason ? <span>· {entry.reason}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Nothing logged yet.</p>
      )}
    </section>
  );
}
