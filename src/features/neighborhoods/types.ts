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
  image_paths: string[];
  image_urls: string[];
  author_id: string | null;
  going_count: number;
  volunteer_count: number;
  interested_count: number;
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

// Neighborhood Today is a local-first board: every date is shown in the
// neighborhood's own time zone, with a fixed locale, so the server and the
// browser always render the exact same string (no hydration mismatch).
export const NEIGHBORHOOD_TIME_ZONE = "America/New_York";
const DISPLAY_LOCALE = "en-US";

const dateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: NEIGHBORHOOD_TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: NEIGHBORHOOD_TIME_ZONE,
});

const timestampFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: NEIGHBORHOOD_TIME_ZONE,
});

export function formatDate(value: string | null) {
  if (!value) return null;
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | null) {
  if (!value) return null;
  return dateTimeFormatter.format(new Date(value));
}

export function formatTimestamp(value: string | null) {
  if (!value) return null;
  return timestampFormatter.format(new Date(value));
}

