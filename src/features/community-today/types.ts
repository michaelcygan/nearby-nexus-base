/**
 * Normalized shapes for everything Today shows that does not live in our own
 * database. Upstream response shapes never travel past the server modules in
 * this folder — components only ever see these types.
 */

export type CivicProvider = "chicago_socrata";

export type WeatherAlert = {
  id: string;
  title: string;
  severity: "extreme" | "severe" | "moderate" | "minor" | "unknown";
  endsAt: string | null;
  url: string;
};

export type CommunityWeather = {
  /** Present only when a nearby station reported an actual observation. */
  observedTemperatureF: number | null;
  /** Used when there is no observation — labeled as a forecast in the UI. */
  forecastTemperatureF: number | null;
  shortForecast: string;
  highF: number | null;
  lowF: number | null;
  precipitationChance: number | null;
  wind: string | null;
  observedAt: string | null;
  attributionUrl: string;
  alerts: WeatherAlert[];
};

export type OfficialSource = "Chicago Public Library" | "Chicago Park District";

export type OfficialCommunityItem = {
  id: string;
  source: OfficialSource;
  title: string;
  startsAt: string | null;
  /** Official schedule text (park programs) — never a computed occurrence. */
  scheduleText: string | null;
  locationName: string;
  audience: string | null;
  fee: string | null;
  url: string;
};

export type CivicServicePulseEntry = { label: string; count: number };

export type CivicServicePulse = {
  windowDays: number;
  entries: CivicServicePulseEntry[];
  attributionUrl: string;
};

/** Everything Today needs from our own database, in one payload. */
export type TodayBoardSummary = {
  counts: { plan: number; marketplace: number; volunteer: number; places: number };
};

/**
 * Strips control characters and collapses whitespace. External strings are
 * always untrusted: we render text only, never markup.
 */
export function plainText(value: unknown, maxLength = 240): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Only ever allow the two official hosts we integrate with. */
const ALLOWED_LINK_HOSTS = new Set([
  "chipublib.org",
  "www.chipublib.org",
  "chicagoparkdistrict.com",
  "www.chicagoparkdistrict.com",
  "app.perfectmind.com",
  "data.cityofchicago.org",
  "www.chicago.gov",
  "api.weather.gov",
  "www.weather.gov",
  "alerts.weather.gov",
]);

/** Returns the URL only when it is https and on an allow-listed host. */
export function safeExternalUrl(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return fallback;
    if (!ALLOWED_LINK_HOSTS.has(url.hostname)) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}
