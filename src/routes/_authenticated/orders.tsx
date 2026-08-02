import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { myStoreOrdersQuery } from "@/features/store/queries";
import { formatMoney, storeOrderStatusLabels } from "@/features/store/types";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Your orders — Neighborhood Today" },
      {
        name: "description",
        content: "Everything you've bought from the neighborhood store and where to pick it up.",
      },
      { property: "og:title", content: "Your orders — Neighborhood Today" },
      {
        property: "og:description",
        content: "Everything you've bought from the neighborhood store and where to pick it up.",
      },
    ],
  }),
  component: OrdersPage,
  errorComponent: () => <ErrorState title="Your orders didn't load" />,
});

function OrdersPage() {
  const orders = useQuery(myStoreOrdersQuery());

  return (
    <section className="max-w-2xl">
      <h2 className="text-2xl">Your orders</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Store pickups happen in the neighborhood — the note on each order says where.
      </p>

      {orders.isLoading ? (
        <p className="mt-5 text-sm text-muted-foreground">Loading…</p>
      ) : (orders.data?.length ?? 0) === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No orders yet"
            description="When you buy something from a neighborhood store, it shows up here."
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {orders.data?.map((order) => (
            <li key={order.id} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold">
                  {order.listing?.title ?? "Store item"}
                </h3>
                <span className="font-sans text-sm font-semibold">
                  {formatMoney(order.amount_cents, order.currency)}
                </span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {storeOrderStatusLabels[order.status]}
              </p>
              {(order.pickup_note ?? order.listing?.pickup_notes) ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Pickup: {order.pickup_note ?? order.listing?.pickup_notes}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
