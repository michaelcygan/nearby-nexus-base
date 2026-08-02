import { z } from "zod";

import { cached, fetchJson } from "./external.server";
import {
  plainText,
  safeExternalUrl,
  type CivicServicePulse,
  type OfficialCommunityItem,
} from "./types";

/**
 * Chicago Data Portal (Socrata) adapters. Server-only, allow-listed host,
 * anonymous by default with optional app-token throughput. Nothing here is
 * ingested into our posts table — these are read-only civic references.
 */

const SOCRATA_ORIGIN = "https://data.cityofchicago.org";
const LIBRARY_DATASET = "vsdy-d8k7";
const PARK_DATASET = "tn7v-6rnw";
const SERVICE_DATASET = "v6vf-nfxy";

const RESULT_TTL = 45 * 60 * 1000;
const RADIUS_METERS = 3200; // ~2 miles
const LIBRARY_WINDOW_DAYS = 14;
const SERVICE_WINDOW_DAYS = 7;

/** Types that would read as neighborhood pathology, not public service. */
const SERVICE_TYPE_EXCLUSIONS = ["311 INFORMATION ONLY CALL", "Aircraft Noise Complaint"];

function headers(): Record<string, string> {
  const token = process.env["SOCRATA_APP_TOKEN"];
  const base: Record<string, string> = { Accept: "application/json" };
  if (token) base["X-App-Token"] = token;
  return base;
}

function endpoint(dataset: string, params: Record<string, string>) {
  const url = new URL(`${SOCRATA_ORIGIN}/resource/${dataset}.json`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 19);
}

/** Socrata "URL" columns arrive as `{ url, description }`, not a bare string. */
const linkSchema = z
  .union([z.string(), z.object({ url: z.string().optional() })])
  .nullish()
  .transform((value) => (typeof value === "string" ? value : (value?.url ?? undefined)));

const librarySchema = z
  .array(
    z.object({
      event_id: z.string().optional(),
      title: z.string().optional(),
      event_types: z.string().optional(),
      event_audiences: z.string().optional(),
      event_page: linkSchema,
      location_name: z.string().optional(),
      start: z.string().optional(),
    }),
  )
  .default([]);

const parkSchema = z
  .array(
    z.object({
      activity_id: z.string().optional(),
      title: z.string().optional(),
      start_date: z.string().optional(),
      date_notes: z.string().optional(),
      location_facility: z.string().optional(),
      age_range: z.string().optional(),
      fee: z.string().optional(),
      information_link: linkSchema,
    }),
  )
  .default([]);

const serviceSchema = z
  .array(z.object({ sr_type: z.string().optional(), total: z.string().optional() }))
  .default([]);

/** Park fees are published as bare numbers; free programs publish nothing. */
function formatFee(value: unknown): string | null {
  const text = plainText(value, 24);
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) {
    const amount = Number(text);
    if (amount === 0) return "Free";
    return `$${amount % 1 === 0 ? amount : amount.toFixed(2)}`;
  }
  return text;
}

/** Upcoming, non-cancelled library events near the community center. */
export async function fetchLibraryEvents({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}): Promise<OfficialCommunityItem[]> {
  const nowIso = new Date().toISOString().slice(0, 19);
  const url = endpoint(LIBRARY_DATASET, {
    $select: "event_id,title,event_types,event_audiences,event_page,location_name,start",
    $where: [
      `within_circle(location, ${lat}, ${lng}, ${RADIUS_METERS})`,
      `start > '${nowIso}'`,
      `start < '${isoDaysFromNow(LIBRARY_WINDOW_DAYS)}'`,
      "(cancelled IS NULL OR cancelled = false)",
    ].join(" AND "),
    $order: "start ASC",
    $limit: "6",
  });

  return cached(`cpl:${lat.toFixed(3)},${lng.toFixed(3)}`, RESULT_TTL, async () => {
    const rows = librarySchema.parse(await fetchJson({ url, headers: headers(), timeoutMs: 5000 }));
    return rows.flatMap<OfficialCommunityItem>((row, index) => {
      const title = plainText(row.title, 120);
      if (!title) return [];
      return [
        {
          id: `cpl-${row.event_id ?? index}`,
          source: "Chicago Public Library",
          title,
          startsAt: row.start ?? null,
          scheduleText: null,
          locationName: plainText(row.location_name, 80) || "Chicago Public Library",
          audience: plainText(row.event_audiences, 60) || plainText(row.event_types, 60) || null,
          fee: null,
          url: safeExternalUrl(row.event_page, "https://www.chipublib.org/events/"),
        },
      ];
    });
  });
}

/** Park programs near the center. Schedule text is shown exactly as published. */
export async function fetchParkActivities({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}): Promise<OfficialCommunityItem[]> {
  const url = endpoint(PARK_DATASET, {
    $select:
      "activity_id,title,start_date,date_notes,location_facility,age_range,fee,information_link",
    $where: [
      `within_circle(location, ${lat}, ${lng}, ${RADIUS_METERS})`,
      `start_date > '${new Date().toISOString().slice(0, 19)}'`,
    ].join(" AND "),
    $order: "start_date ASC",
    $limit: "6",
  });

  return cached(`cpd:${lat.toFixed(3)},${lng.toFixed(3)}`, RESULT_TTL, async () => {
    const rows = parkSchema.parse(await fetchJson({ url, headers: headers(), timeoutMs: 5000 }));
    return rows.flatMap<OfficialCommunityItem>((row, index) => {
      const title = plainText(row.title, 120);
      if (!title) return [];
      return [
        {
          id: `cpd-${row.activity_id ?? index}`,
          source: "Chicago Park District",
          title,
          startsAt: null,
          scheduleText: plainText(row.date_notes, 120) || null,
          locationName: plainText(row.location_facility, 80) || "Chicago Park District",
          audience: plainText(row.age_range, 40) || null,
          fee: formatFee(row.fee),
          url: safeExternalUrl(row.information_link, "https://www.chicagoparkdistrict.com/"),
        },
      ];
    });
  });
}

/**
 * A calm seven-day aggregate of 311 activity for one official community area.
 * Aggregation happens server-side in SoQL — no raw complaint rows, no
 * addresses, no caller information ever reaches the app.
 */
export async function fetchServicePulse(areaCode: string): Promise<CivicServicePulse | null> {
  const area = areaCode.replace(/\D/g, "");
  if (!area) return null;

  const since = new Date(Date.now() - SERVICE_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 19);
  const exclusions = SERVICE_TYPE_EXCLUSIONS.map((type) => `sr_type != '${type}'`).join(" AND ");
  const url = endpoint(SERVICE_DATASET, {
    $select: "sr_type,count(*) as total",
    $where: [
      `community_area = ${area}`,
      `created_date > '${since}'`,
      "(duplicate IS NULL OR duplicate = false)",
      exclusions,
    ].join(" AND "),
    $group: "sr_type",
    $order: "total DESC",
    $limit: "3",
  });

  return cached(`c311:${area}`, RESULT_TTL, async () => {
    const rows = serviceSchema.parse(await fetchJson({ url, headers: headers(), timeoutMs: 5000 }));
    const entries = rows.flatMap((row) => {
      const label = plainText(row.sr_type, 60);
      const count = Number(row.total ?? 0);
      if (!label || !Number.isFinite(count) || count <= 0) return [];
      return [{ label, count }];
    });
    if (entries.length === 0) return null;
    return {
      windowDays: SERVICE_WINDOW_DAYS,
      entries,
      attributionUrl:
        "https://data.cityofchicago.org/Service-Requests/311-Service-Requests/v6vf-nfxy",
    };
  });
}
