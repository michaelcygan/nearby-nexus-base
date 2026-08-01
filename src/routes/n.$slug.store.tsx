import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PostListSkeleton } from "@/components/common/post-list-skeleton";
import { PaymentTestModeBanner } from "@/components/store/payment-test-mode-banner";
import { storeListingsQuery } from "@/features/store/queries";
import { formatMoney, storeListingStatusLabels } from "@/features/store/types";

export const Route = createFileRoute("/n/$slug/store")({
  loader: ({ params, context }) => {
    context.queryClient.ensureQueryData(storeListingsQuery(params.slug));
  },
  head: ({ params }) => ({
    links: [{ rel: "canonical", href: canonicalUrl(`/n/${params.slug}/store`) }],
    meta: [
      { title: "Neighborhood Store — Neighborhood Today" },
      {
        name: "description",
        content:
          "One-of-a-kind goods from the neighborhood store. Buy online, pick up a few blocks away.",
      },
      { property: "og:title", content: "Neighborhood Store — Neighborhood Today" },
      {
        property: "og:description",
        content:
          "One-of-a-kind goods from the neighborhood store. Buy online, pick up a few blocks away.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: canonicalUrl(`/n/${params.slug}/store`) },
    ],
  }),
  component: StoreBoard,
  errorComponent: () => <ErrorState title="The store didn't load" />,
});

function StoreBoard() {
  const { slug } = Route.useParams();
  return (
    <section>
      <h2 className="text-xl">Neighborhood Store</h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        A short shelf of one-of-a-kind things. Pay online, pick up in the neighborhood.
      </p>
      <div className="mt-4 max-w-prose">
        <PaymentTestModeBanner />
      </div>
      <Suspense
        fallback={
          <div className="mt-5">
            <PostListSkeleton />
          </div>
        }
      >
        <Listings slug={slug} />
      </Suspense>
    </section>
  );
}

function Listings({ slug }: { slug: string }) {
  const { data: listings } = useSuspenseQuery(storeListingsQuery(slug));

  if (listings.length === 0) {
    return (
      <div className="mt-5">
        <EmptyState
          title="The shelf is empty"
          description="Nothing is for sale in this neighborhood right now. Check back soon."
        />
      </div>
    );
  }

  return (
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {listings.map((listing) => (
        <li
          key={listing.id}
          className="rounded-md border border-border bg-card transition-colors hover:border-primary/50"
        >
          <Link
            to="/n/$slug/item/$listingId"
            params={{ slug, listingId: listing.id }}
            className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {listing.image_urls[0] ? (
              <img
                src={listing.image_urls[0]}
                alt={listing.title}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-t-md object-cover"
              />
            ) : null}
            <div className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-base font-semibold">{listing.title}</h3>
                <span className="font-sans text-sm font-semibold text-primary">
                  {formatMoney(listing.price_cents, listing.currency)}
                </span>
              </div>
              {listing.condition ? (
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {listing.condition}
                </p>
              ) : null}
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {listing.description}
              </p>
              {listing.status !== "available" ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {storeListingStatusLabels[listing.status]}
                </p>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
