import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { myAdminStatusQuery } from "@/features/directory/queries";
import { neighborhoodsQuery } from "@/features/neighborhoods/queries";
import { useSession } from "@/hooks/use-session";

const SITE_ORIGIN = "https://nearby-nexus-base.lovable.app";

export const Route = createFileRoute("/_authenticated/admin/access-points")({
  head: () => ({
    meta: [
      { title: "Access points — Neighborhood Today" },
      {
        name: "description",
        content:
          "Admin tool for copying the neighborhood board URLs used on NFC chips and printed QR stickers.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccessPointsPage,
});

function AccessPointsPage() {
  const { session } = useSession();
  const admin = useQuery({ ...myAdminStatusQuery(), enabled: Boolean(session) });
  const neighborhoods = useQuery(neighborhoodsQuery());
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(url: string, slug: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(slug);
      toast.success("Link copied");
      window.setTimeout(() => setCopied((current) => (current === slug ? null : current)), 2000);
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

  if (!admin.data?.isAdmin) {
    return (
      <AppShell>
        <PageContainer>
          <EmptyState
            title="Admins only"
            description="Access point links are managed by neighborhood admins."
          />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer>
        <header className="max-w-2xl">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Admin
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Access points</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Each neighborhood has one permanent board URL. Program it onto your NFC chips or
            encode it in your own QR generator — a scan opens the neighborhood board directly, with
            no redirect in between. These links never change, so a chip you program today keeps
            working.
          </p>
        </header>

        <div className="rule-print my-8" />

        {neighborhoods.isError ? (
          <ErrorState
            title="Could not load neighborhoods"
            description="Refresh the page to try again."
            onRetry={() => void neighborhoods.refetch()}
          />
        ) : neighborhoods.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (neighborhoods.data ?? []).length === 0 ? (
          <EmptyState
            title="No neighborhoods yet"
            description="Add a neighborhood before programming access points."
          />
        ) : (
          <ul className="space-y-4 print:space-y-6">
            {(neighborhoods.data ?? []).map((neighborhood) => {
              const url = `${SITE_ORIGIN}/n/${neighborhood.slug}`;
              return (
                <li
                  key={neighborhood.id}
                  className="rounded-md border border-border bg-card p-4 print:break-inside-avoid print:border-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-xl font-semibold">{neighborhood.name}</h2>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {neighborhood.city}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="print:hidden"
                      onClick={() => void copy(url, neighborhood.slug)}
                    >
                      {copied === neighborhood.slug ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                  <p className="mt-3 break-all rounded-sm border border-dashed border-border bg-background px-3 py-2 font-mono text-sm">
                    {url}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground print:hidden">
                    Tap or scan opens the {neighborhood.name} board.
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
            Use the button below to print this page. Each neighborhood prints as its own card with
            the name and the full URL, ready to trim and pair with a chip or a QR label.
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => window.print()}>
            Print sticker cards
          </Button>
        </section>
      </PageContainer>
    </AppShell>
  );
}
