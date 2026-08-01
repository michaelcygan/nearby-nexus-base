import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ReportButton } from "@/components/moderation/report-button";
import { PaymentTestModeBanner } from "@/components/store/payment-test-mode-banner";
import { StoreCheckout } from "@/components/store/store-checkout";
import { Button } from "@/components/ui/button";
import { storeListingQuery } from "@/features/store/queries";
import { formatMoney, storeListingStatusLabels } from "@/features/store/types";
import { useSession } from "@/hooks/use-session";
import { isPaymentsConfigured } from "@/lib/stripe";
import { canonicalUrl } from "@/lib/seo";

export const Route = createFileRoute("/n/$slug/item/$listingId")({
  loader: async ({ params, context }) => {
    const listing = await context.queryClient.ensureQueryData(storeListingQuery(params.listingId));
    if (!listing) throw notFound();
    return { listing };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Item unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const { listing } = loaderData;
    const title = `${listing.title} — ${listing.neighborhood.name} store`;
    const description = listing.description.slice(0, 155);
    const image = listing.image_urls[0];
    return {
      links: [{ rel: "canonical", href: canonicalUrl(`/n/${params.slug}/item/${params.listingId}`) }],
      meta: [
        { title },
        { property: "og:url", content: canonicalUrl(`/n/${params.slug}/item/${params.listingId}`) },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image?.startsWith("https://")
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  component: StoreItemPage,
  errorComponent: () => <ErrorState title="This item didn't load" />,
  notFoundComponent: () => (
    <EmptyState
      title="Item not found"
      description="It may have sold or been taken down. Browse the store for what's on the shelf now."
    />
  ),
});

function StoreItemPage() {
  const { slug, listingId } = Route.useParams();
  const { data: listing } = useSuspenseQuery(storeListingQuery(listingId));
  const { session, loading } = useSession();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (!listing) return <EmptyState title="Item not found" />;

  const buyable = listing.status === "available";

  return (
    <article className="max-w-2xl">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        Neighborhood Store
      </p>
      <h2 className="mt-2 text-2xl sm:text-3xl">{listing.title}</h2>
      <p className="mt-2 font-sans text-lg font-semibold">
        {formatMoney(listing.price_cents, listing.currency)}
      </p>

      {listing.image_urls.length > 0 ? (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {listing.image_urls.map((url) => (
            <li key={url}>
              <img
                src={url}
                alt={listing.title}
                loading="lazy"
                className="w-full rounded-md border border-border object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-foreground/90">
        {listing.description}
      </p>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
        {listing.condition ? (
          <div className="bg-card p-4">
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Condition</dt>
            <dd className="mt-1 text-base">{listing.condition}</dd>
          </div>
        ) : null}
        <div className="bg-card p-4">
          <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Pickup</dt>
          <dd className="mt-1 text-base">
            {listing.pickup_notes ?? `Local pickup in ${listing.neighborhood.name}`}
          </dd>
        </div>
        <div className="bg-card p-4">
          <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Status</dt>
          <dd className="mt-1 text-base">{storeListingStatusLabels[listing.status]}</dd>
        </div>
      </dl>

      <div className="mt-6 space-y-3">
        <PaymentTestModeBanner />
        {!buyable ? (
          <p className="text-sm text-muted-foreground">
            {listing.status === "sold"
              ? "This one sold. One-of-a-kind means one."
              : "Not available for checkout right now."}
          </p>
        ) : !isPaymentsConfigured() ? (
          <p className="text-sm text-muted-foreground">Checkout is temporarily unavailable.</p>
        ) : loading ? null : !session ? (
          <Button asChild size="sm">
            <Link to="/auth">Sign in to buy</Link>
          </Button>
        ) : checkoutOpen ? (
          <StoreCheckout listingId={listing.id} />
        ) : (
          <Button size="sm" onClick={() => setCheckoutOpen(true)}>
            Buy — {formatMoney(listing.price_cents, listing.currency)}
          </Button>
        )}
      </div>

      <div className="mt-8">
        <ReportButton targetType="store_listing" targetId={listing.id} />
      </div>

      <p className="mt-4 text-sm">
        <Link
          to="/n/$slug/store"
          params={{ slug }}
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Back to the store
        </Link>
      </p>
    </article>
  );
}
