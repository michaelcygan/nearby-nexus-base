export type StoreListingStatus = "draft" | "available" | "reserved" | "sold" | "archived";
export type StoreOrderStatus = "pending" | "paid" | "cancelled" | "refunded" | "fulfilled";

export type StoreListing = {
  id: string;
  neighborhood_id: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  condition: string | null;
  pickup_notes: string | null;
  image_paths: string[];
  image_urls: string[];
  status: StoreListingStatus;
  created_at: string;
};

export type StoreListingDetail = StoreListing & {
  neighborhood: { slug: string; name: string; city: string };
};

export type AdminStoreListing = StoreListing & {
  stripe_product_id: string | null;
  hidden: boolean;
  removed: boolean;
  neighborhood: { slug: string; name: string } | null;
};

export type StoreOrder = {
  id: string;
  listing_id: string;
  amount_cents: number;
  currency: string;
  status: StoreOrderStatus;
  pickup_note: string | null;
  created_at: string;
  paid_at: string | null;
  fulfilled_at: string | null;
  listing: { id: string; title: string; pickup_notes: string | null } | null;
};

export type AdminStoreOrder = StoreOrder & {
  buyer_email: string | null;
  buyer_name: string | null;
};

export const storeListingStatusLabels: Record<StoreListingStatus, string> = {
  draft: "Draft",
  available: "For sale",
  reserved: "In checkout",
  sold: "Sold",
  archived: "Archived",
};

export const storeOrderStatusLabels: Record<StoreOrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "Paid — arrange pickup",
  cancelled: "Cancelled",
  refunded: "Refunded",
  fulfilled: "Picked up",
};

export function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
