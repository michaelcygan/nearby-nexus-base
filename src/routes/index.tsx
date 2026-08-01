import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PostListSkeleton } from "@/components/common/post-list-skeleton";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { neighborhoodsQuery } from "@/features/neighborhoods/queries";

const title = "Neighborhood Today — the noticeboard for your block";
const description =
  "Plans, marketplace listings, volunteer needs, a local directory, and neighborhood merch — one quiet page per neighborhood, no account needed to read it.";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(neighborhoodsQuery());
  },
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});


const modules = [
  {
    name: "Plans",
    blurb: "Stoop hangs, park cleanups, a Tuesday run club. Say you're coming.",
  },
  {
    name: "Marketplace",
    blurb: "Sell it, lend it, give it away — to people three doors down.",
  },
  {
    name: "Volunteer",
    blurb: "Small asks that need a hand, and neighbors willing to give one.",
  },
  {
    name: "Directory",
    blurb: "The shops, parks, and services that are actually here. Fix it if it's wrong.",
  },
  {
    name: "Store",
    blurb: "Neighborhood merch, printed properly, shipped by the block.",
  },
] as const;

function Index() {
  return (
    <AppShell>
      <PageContainer>
        <section className="border-b border-border pb-10">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Local noticeboard
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl leading-[1.05] sm:text-5xl">
            What's happening on your block, on one page.
          </h1>
          <p className="mt-4 max-w-prose text-base text-muted-foreground">{description}</p>
        </section>

        <section className="py-10">
          <h2 className="text-xl">Five things per neighborhood</h2>
          <ul className="mt-5 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
            {modules.map((m) => (
              <li key={m.name} className="bg-card p-5">
                <h3 className="font-display text-base font-semibold">{m.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.blurb}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rule-print py-10">
          <h2 className="text-xl">Built for reading first</h2>
          <p className="mt-3 max-w-prose text-sm text-muted-foreground">
            Neighborhood pages are public. Tap an NFC sticker on a lamppost or open a link a
            neighbor sent you and you land straight in context — no sign-up wall, no feed
            algorithm, no popularity counts. Signing in is only for taking part.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Read the{" "}
            <Link
              to="/community-guidelines"
              className="text-foreground underline underline-offset-4"
            >
              community guidelines
            </Link>{" "}
            to see how we keep it civil.
          </p>
        </section>
      </PageContainer>
    </AppShell>
  );
}
