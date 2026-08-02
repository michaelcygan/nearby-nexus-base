export type PostType = "plan" | "marketplace" | "volunteer";
export type PostStatus = "active" | "completed" | "expired" | "removed";
export type LocationType = "neighborhood" | "town" | "village" | "city";
export type CommunityStatus = "draft" | "published";

export type Neighborhood = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state_code: string | null;
  location_type: LocationType;
  timezone: string;
  status: CommunityStatus;
  tagline: string | null;
  about: string | null;
  /** Approximate discovery anchor, not a boundary. Null on unmapped communities. */
  center_lat: number | null;
  center_lng: number | null;
  /** Which public-data provider (if any) backs this community's civic sections. */
  civic_provider: string | null;
  /** Official area identifiers used by that provider (e.g. Chicago area numbers). */
  civic_area_codes: string[];
};


/** The smallest shape a component needs to render a community's content. */
export type CommunityRef = {
  slug: string;
  name: string;
  city: string;
  state_code: string | null;
  timezone: string;
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
  author_name: string | null;
  going_count: number;
  volunteer_count: number;
  interested_count: number;
};

export type PostDetail = PostSummary & {
  neighborhood: CommunityRef;
};

export type Place = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
};

export type PlaceDetail = Place & {
  neighborhood: CommunityRef;
};

export const postTypeLabels: Record<PostType, string> = {
  plan: "Plan",
  marketplace: "For sale",
  volunteer: "Help wanted",
};

/** Plain-language composer actions, mapped to the three existing post types. */
export const composerActions = [
  { type: "plan", label: "Make a plan" },
  { type: "marketplace", label: "Sell or give something away" },
  { type: "volunteer", label: "Ask for help" },
] as const satisfies ReadonlyArray<{ type: PostType; label: string }>;

/** Board filters. `today` is everything; `places` is the curated directory. */
export const boardViews = ["today", "plans", "marketplace", "help", "places"] as const;
export type BoardView = (typeof boardViews)[number];

export const boardViewLabels: Record<BoardView, string> = {
  today: "Today",
  plans: "Plans",
  marketplace: "Marketplace",
  help: "Help",
  places: "Places",
};

export const boardViewPostType: Record<BoardView, PostType | null> = {
  today: null,
  plans: "plan",
  marketplace: "marketplace",
  help: "volunteer",
  places: null,
};

export function isBoardView(value: unknown): value is BoardView {
  return typeof value === "string" && (boardViews as readonly string[]).includes(value);
}

export function formatPrice(priceCents: number | null, isFree: boolean | null) {
  if (isFree || priceCents === 0) return "Free";
  if (priceCents === null) return null;
  return `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`;
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

/** "Chicago, Illinois" — the line that sits beneath the community name. */
export function placeLine(community: { city: string; state_code: string | null }) {
  const state = community.state_code ? STATE_NAMES[community.state_code.toUpperCase()] : null;
  return state ? `${community.city}, ${state}` : community.city;
}

// Neighborhood Today is a local-first board: every date is shown in the
// community's own time zone, with a fixed locale, so the server and the
// browser always render the exact same string (no hydration mismatch).
const DISPLAY_LOCALE = "en-US";

/** Fallback for account-level chrome that isn't scoped to one community. */
export const FALLBACK_TIME_ZONE = "America/Chicago";

type FormatterKind = "date" | "dateTime" | "timestamp";

const FORMATTER_OPTIONS: Record<FormatterKind, Intl.DateTimeFormatOptions> = {
  date: { weekday: "short", month: "short", day: "numeric" },
  dateTime: {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
  timestamp: {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(kind: FormatterKind, timeZone: string) {
  const key = `${kind}|${timeZone}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
      ...FORMATTER_OPTIONS[kind],
      timeZone,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatDate(value: string | null, timeZone = FALLBACK_TIME_ZONE) {
  if (!value) return null;
  return formatterFor("date", timeZone).format(new Date(value));
}

export function formatDateTime(value: string | null, timeZone = FALLBACK_TIME_ZONE) {
  if (!value) return null;
  return formatterFor("dateTime", timeZone).format(new Date(value));
}

export function formatTimestamp(value: string | null, timeZone = FALLBACK_TIME_ZONE) {
  if (!value) return null;
  return formatterFor("timestamp", timeZone).format(new Date(value));
}
