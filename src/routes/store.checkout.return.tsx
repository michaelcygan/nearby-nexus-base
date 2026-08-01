import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { getMyStoreOrder } from "@/features/store/store.functions";
import { formatMoney, storeOrderStatusLabels } from "@/features/store/types";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/store/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } =>
    typeof search["session_id"] === "string" ? { session_id: search["session_id"] } : {},
  head: () => ({
    meta: [
      { title: "Order confirmation — Neighborhood Today" },
      { name: "description", content: "Your neighborhood store order and pickup details." },
      { property: "og:title", content: "Order confirmation — Neighborhood Today" },
      { property: "og:description", content: "Your neighborhood store order and pickup details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturn,
  errorComponent: () => <ErrorState title="We couldn't load that order" />,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();
  const order = useQuery({
    queryKey: ["store", "return", sessionId],
    enabled: Boolean(sessionId),
    queryFn: () =>
      getMyStoreOrder({
        data: { sessionId: sessionId as string, environment: getStripeEnvironment() },
      }),
  });

  return (
    <section className="max-w-xl">
      <h2 className="text-2xl">Order confirmation</h2>

      {!sessionId ? (
        <p className="mt-3 text-sm text-muted-foreground">
          We didn't get an order reference. Check your orders for the latest status.
        </p>
      ) : order.isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Confirming your payment…</p>
      ) : order.isError ? (
        <p className="mt-3 text-sm text-muted-foreground">
          We couldn't confirm this order yet. It may still be settling — check your orders in a
          minute.
        </p>
      ) : order.data ? (
        <div className="mt-4 rounded-md border border-border bg-card p-4">
          <p className="font-display text-lg font-semibold">{order.data.listing?.title ?? "Store item"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMoney(order.data.amount_cents, order.data.currency)} ·{" "}
            {storeOrderStatusLabels[order.data.status]}
          </p>
          {order.data.listing?.pickup_notes ? (
            <p className="mt-3 text-sm">
              <span className="uppercase tracking-[0.12em] text-muted-foreground">Pickup: </span>
              {order.data.listing.pickup_notes}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild size="sm">
          <Link to="/orders">Your orders</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/">Back to neighborhoods</Link>
        </Button>
      </div>
    </section>
  );
}
