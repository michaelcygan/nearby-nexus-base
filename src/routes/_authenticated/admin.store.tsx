import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PostImageUploader, type UploadedImage } from "@/components/posts/post-image-uploader";
import { PaymentTestModeBanner } from "@/components/store/payment-test-mode-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { neighborhoodsQuery } from "@/features/neighborhoods/queries";
import {
  saveStoreListing,
  setStoreListingStatus,
  updateStoreOrder,
} from "@/features/store/admin.functions";
import { getMyStoreRole } from "@/features/store/admin.functions";
import { adminStoreListingsQuery, adminStoreOrdersQuery } from "@/features/store/queries";
import {
  formatMoney,
  storeListingStatusLabels,
  storeOrderStatusLabels,
} from "@/features/store/types";
import { useSession } from "@/hooks/use-session";
import { getStripeEnvironment } from "@/lib/stripe";

type ListingForm = {
  neighborhood_id: string;
  title: string;
  description: string;
  price: string;
  condition: string;
  pickup_notes: string;
};

const emptyForm: ListingForm = {
  neighborhood_id: "",
  title: "",
  description: "",
  price: "",
  condition: "",
  pickup_notes: "",
};

export const Route = createFileRoute("/_authenticated/admin/store")({
  head: () => ({
    meta: [
      { title: "Store listings — Neighborhood Today" },
      {
        name: "description",
        content: "Admin tools for listing one-of-a-kind store items and handling pickup orders.",
      },
      { property: "og:title", content: "Store listings — Neighborhood Today" },
      {
        property: "og:description",
        content: "Admin tools for listing one-of-a-kind store items and handling pickup orders.",
      },
    ],
  }),
  component: AdminStorePage,
  errorComponent: () => <ErrorState title="The store admin didn't load" />,
});

function AdminStorePage() {
  const role = useQuery({ queryKey: ["store", "role"], queryFn: () => getMyStoreRole() });

  if (role.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!role.data?.isAdmin) {
    return (
      <EmptyState
        title="Admins only"
        description="The neighborhood store is managed by admins. Ask an admin if you need access."
      />
    );
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h2 className="text-2xl">Store listings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          One-of-a-kind items, local pickup only. Publishing makes an item buyable right away.
        </p>
        <div className="mt-4">
          <PaymentTestModeBanner />
        </div>
      </div>
      <ListingComposer />
      <ListingTable />
      <OrderQueue />
    </div>
  );
}

function ListingComposer() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const neighborhoods = useQuery(neighborhoodsQuery());
  const [form, setForm] = useState<ListingForm>(emptyForm);
  const [images, setImages] = useState<UploadedImage[]>([]);

  const save = useMutation({
    mutationFn: (publish: boolean) =>
      saveStoreListing({
        data: {
          neighborhood_id: form.neighborhood_id,
          title: form.title,
          description: form.description,
          price_dollars: Number(form.price),
          condition: form.condition,
          pickup_notes: form.pickup_notes,
          image_paths: images.map((image) => image.path),
          publish,
          environment: getStripeEnvironment(),
        },
      }),
    onSuccess: (result) => {
      if ("warning" in result && result.warning) {
        toast.warning(`Saved, but the payment product failed: ${result.warning}`);
      } else {
        toast.success("Listing saved.");
      }
      setForm(emptyForm);
      setImages([]);
      void queryClient.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const ready =
    form.neighborhood_id && form.title.trim().length > 2 && form.description.trim().length > 9 && Number(form.price) >= 0.5;

  return (
    <form
      className="space-y-4 rounded-md border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(true);
      }}
    >
      <h3 className="font-display text-lg font-semibold">Add an item</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Neighborhood</Label>
          <Select
            value={form.neighborhood_id}
            onValueChange={(value) => setForm({ ...form, neighborhood_id: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose a neighborhood" />
            </SelectTrigger>
            <SelectContent>
              {(neighborhoods.data ?? []).map((hood) => (
                <SelectItem key={hood.id} value={hood.id}>
                  {hood.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="store-price">Price (USD)</Label>
          <Input
            id="store-price"
            inputMode="decimal"
            className="mt-1"
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
            placeholder="45.00"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="store-title">Title</Label>
        <Input
          id="store-title"
          className="mt-1"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Cast iron skillet, seasoned"
        />
      </div>

      <div>
        <Label htmlFor="store-description">Description</Label>
        <Textarea
          id="store-description"
          className="mt-1"
          rows={4}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="What it is, how it's held up, anything a buyer should know."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="store-condition">Condition</Label>
          <Input
            id="store-condition"
            className="mt-1"
            value={form.condition}
            onChange={(event) => setForm({ ...form, condition: event.target.value })}
            placeholder="Used — good"
          />
        </div>
        <div>
          <Label htmlFor="store-pickup">Pickup note</Label>
          <Input
            id="store-pickup"
            className="mt-1"
            value={form.pickup_notes}
            onChange={(event) => setForm({ ...form, pickup_notes: event.target.value })}
            placeholder="Porch pickup on Butler St, evenings"
          />
        </div>
      </div>

      {session ? (
        <div>
          <Label className="mb-2 block">Photos</Label>
          <PostImageUploader userId={session.user.id} images={images} onChange={setImages} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm" disabled={!ready || save.isPending}>
          {save.isPending ? "Saving…" : "Publish item"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!ready || save.isPending}
          onClick={() => save.mutate(false)}
        >
          Save as draft
        </Button>
      </div>
    </form>
  );
}

function ListingTable() {
  const queryClient = useQueryClient();
  const listings = useQuery(adminStoreListingsQuery());

  const setStatus = useMutation({
    mutationFn: (input: { listingId: string; status: "draft" | "available" | "archived" }) =>
      setStoreListingStatus({ data: input }),
    onSuccess: () => {
      toast.success("Listing updated.");
      void queryClient.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (listings.isLoading) return <p className="text-sm text-muted-foreground">Loading listings…</p>;
  if ((listings.data?.length ?? 0) === 0) {
    return (
      <EmptyState title="No listings yet" description="Add the first item to open the store." />
    );
  }

  return (
    <section>
      <h3 className="font-display text-lg font-semibold">All listings</h3>
      <ul className="mt-3 space-y-3">
        {listings.data?.map((listing) => (
          <li key={listing.id} className="rounded-md border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-display text-base font-semibold">{listing.title}</h4>
              <span className="font-sans text-sm font-semibold">
                {formatMoney(listing.price_cents, listing.currency)}
              </span>
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {storeListingStatusLabels[listing.status]}
              {listing.neighborhood ? ` · ${listing.neighborhood.name}` : ""}
              {listing.hidden ? " · hidden by moderation" : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {listing.status !== "available" && !listing.removed ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setStatus.isPending}
                  onClick={() =>
                    setStatus.mutate({ listingId: listing.id, status: "available" })
                  }
                >
                  Put on sale
                </Button>
              ) : null}
              {listing.status === "available" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate({ listingId: listing.id, status: "archived" })}
                >
                  Take off sale
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrderQueue() {
  const queryClient = useQueryClient();
  const orders = useQuery(adminStoreOrdersQuery());

  const update = useMutation({
    mutationFn: (input: {
      orderId: string;
      status: "fulfilled" | "cancelled" | "refunded";
      pickup_note?: string;
    }) => updateStoreOrder({ data: input }),
    onSuccess: () => {
      toast.success("Order updated.");
      void queryClient.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (orders.isLoading) return <p className="text-sm text-muted-foreground">Loading orders…</p>;

  return (
    <section>
      <h3 className="font-display text-lg font-semibold">Orders</h3>
      {(orders.data?.length ?? 0) === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="No orders yet"
            description="Paid orders show up here with the buyer and pickup status."
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {orders.data?.map((order) => (
            <li key={order.id} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-display text-base font-semibold">
                  {order.listing?.title ?? "Store item"}
                </h4>
                <span className="font-sans text-sm font-semibold">
                  {formatMoney(order.amount_cents, order.currency)}
                </span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {storeOrderStatusLabels[order.status]} · {order.buyer_name ?? "Neighbor"}
                {order.buyer_email ? ` · ${order.buyer_email}` : ""}
              </p>
              {order.status === "paid" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ orderId: order.id, status: "fulfilled" })}
                  >
                    Mark picked up
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ orderId: order.id, status: "refunded" })}
                  >
                    Mark refunded
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
