export type PostType = "plan" | "marketplace" | "volunteer";
export type PostStatus = "active" | "completed" | "expired" | "removed";

export type Neighborhood = {
  id: string;
  slug: string;
  name: string;
  city: string;
  tagline: string | null;
  about: string | null;
};

export type PostSummary = {
  id: string;
  type: PostType;
  status: PostStatus;
  title: string;
  body: string;
  created_at: string;
  starts_at: string | null;
  location: string | null;
  capacity: number | null;
  price_cents: number | null;
  is_free: boolean | null;
  condition: string | null;
  needed_by: string | null;
  slots: number | null;
};

export type PostDetail = PostSummary & {
  neighborhood: Pick<Neighborhood, "slug" | "name" | "city">;
};

export type Place = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  hours: string | null;
};

export type PlaceDetail = Place & {
  neighborhood: Pick<Neighborhood, "slug" | "name" | "city">;
};

export const postTypeLabels: Record<PostType, string> = {
  plan: "Plan",
  marketplace: "For sale",
  volunteer: "Volunteer",
};

export const postTypeSlugs = {
  plans: "plan",
  marketplace: "marketplace",
  volunteer: "volunteer",
} as const satisfies Record<string, PostType>;

export function formatPrice(priceCents: number | null, isFree: boolean | null) {
  if (isFree || priceCents === 0) return "Free";
  if (priceCents === null) return null;
  return `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`;
}

export function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
