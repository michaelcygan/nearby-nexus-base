import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createAccessPoint,
  updateAccessPoint,
} from "@/features/access-points/access-points.functions";
import { accessPointsQuery, adminCommunitiesQuery } from "@/features/access-points/queries";
import { myAdminStatusQuery } from "@/features/directory/queries";
import { useSession } from "@/hooks/use-session";
import { SITE_ORIGIN } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/access-points")({
  head: () => ({
    meta: [
      { title: "Access points — Neighborhood Today" },
      {
        name: "description",
        content:
          "Admin tool for generating and copying the scan links used on NFC chips and printed QR codes.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccessPointsPage,
  errorComponent: () => (
    <AppShell>
      <PageContainer>
        <ErrorState title="Access points didn't load" />
      </PageContainer>
    </AppShell>
  ),
});

function AccessPointsPage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const admin = useQuery({ ...myAdminStatusQuery(), enabled: Boolean(session) });
  const isAdmin = Boolean(admin.data?.isAdmin);
  const communities = useQuery({ ...adminCommunitiesQuery(), enabled: isAdmin });
  const points = useQuery({ ...accessPointsQuery(), enabled: isAdmin });

  const [label, setLabel] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createAccessPoint({ data: { neighborhoodId: communityId, label } }),
    onSuccess: () => {
      setLabel("");
      queryClient.invalidateQueries({ queryKey: ["access-points"] });
      toast.success("Access point created.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't create that access point."),
  });

  const toggle = useMutation({
    mutationFn: (vars: { id: string; status: "active" | "paused" }) =>
      updateAccessPoint({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-points"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't update that access point."),
  });

  async function copy(url: string, code: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(code);
      toast.success("Link copied");
      window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  }

  if (admin.isLoading) {
    return (
      <AppShell>
        <PageContainer>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-4 h-40 w-full" />
        </PageContainer>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <PageContainer>
          <EmptyState
            title="Admins only"
            description="Access point links are managed by community admins."
          />
        </PageContainer>
      </AppShell>
    );
  }

  const communityList = communities.data ?? [];
  const selectedCommunity = communityId || communityList[0]?.id || "";

  return (
    <AppShell>
      <PageContainer>
        <header className="max-w-2xl">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Admin
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Access points</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Each access point is one scan link you can program onto an NFC chip or encode in your
            own QR generator. Opening it counts one anonymous scan and sends the visitor to the
            community board. Nothing about the visitor is stored.
          </p>
        </header>

        <div className="rule-print my-8" />

        <section className="max-w-xl print:hidden">
          <h2 className="font-display text-xl font-semibold">New access point</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="ap-community">Community</Label>
              <select
                id="ap-community"
                value={selectedCommunity}
                onChange={(event) => setCommunityId(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {communityList.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                    {community.status === "draft" ? " (draft)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ap-label">Label</Label>
              <Input
                id="ap-label"
                value={label}
                placeholder="Library window sticker"
                onChange={(event) => setLabel(event.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              disabled={!selectedCommunity || create.isPending}
              onClick={() => {
                setCommunityId(selectedCommunity);
                create.mutate();
              }}
            >
              {create.isPending ? "Creating…" : "Generate access point"}
            </Button>
          </div>
        </section>

        <div className="rule-print my-8" />

        {points.isError ? (
          <ErrorState
            title="Could not load access points"
            description="Refresh the page to try again."
            onRetry={() => void points.refetch()}
          />
        ) : points.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (points.data ?? []).length === 0 ? (
          <EmptyState
            title="No access points yet"
            description="Generate one above, then program it onto a chip or QR code."
          />
        ) : (
          <ul className="space-y-4 print:space-y-6">
            {(points.data ?? []).map((point) => {
              const url = `${SITE_ORIGIN}/a/${point.code}`;
              const community = communityList.find((item) => item.id === point.neighborhood_id);
              return (
                <li
                  key={point.id}
                  className="rounded-md border border-border bg-card p-4 print:break-inside-avoid print:border-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-xl font-semibold">{point.label}</h2>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {community?.name ?? "Community"} · {point.status} · {point.scan_count ?? 0}{" "}
                        scans
                      </p>
                    </div>
                    <div className="flex gap-2 print:hidden">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void copy(url, point.code)}
                      >
                        {copied === point.code ? "Copied" : "Copy link"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={toggle.isPending}
                        onClick={() =>
                          toggle.mutate({
                            id: point.id,
                            status: point.status === "active" ? "paused" : "active",
                          })
                        }
                      >
                        {point.status === "active" ? "Pause" : "Resume"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 break-all rounded-sm border border-dashed border-border bg-background px-3 py-2 font-mono text-sm">
                    {url}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground print:hidden">
                    Opens {SITE_ORIGIN}
                    {point.destination_path}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <div className="rule-print my-8" />

        <section className="max-w-2xl print:hidden">
          <h2 className="font-display text-xl font-semibold">Printing sticker cards</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Print this page to get one card per access point with its label and full URL, ready to
            trim and pair with a chip or a QR label.
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => window.print()}>
            Print sticker cards
          </Button>
        </section>
      </PageContainer>
    </AppShell>
  );
}
