import { z } from "zod";

import { cached, fetchJson } from "./external.server";
import type { CommunityWeather, WeatherAlert } from "./types";

/**
 * National Weather Service provider. Every call happens on the server; the
 * browser is never asked for a location, and only the normalized
 * `CommunityWeather` shape crosses back to the client. Isolated here so the
 * provider can change (NWS has signalled future auth changes) without
 * touching Today.
 */

const NWS_ORIGIN = "https://api.weather.gov";
const ATTRIBUTION_URL = "https://www.weather.gov";

const HEADERS = {
  "User-Agent": "neighborhood.today (https://neighborhood.today)",
  Accept: "application/geo+json",
};

const POINT_TTL = 24 * 60 * 60 * 1000;
const FORECAST_TTL = 20 * 60 * 1000;
const OBSERVATION_TTL = 10 * 60 * 1000;
const ALERT_TTL = 5 * 60 * 1000;

const pointSchema = z.object({
  properties: z.object({
    forecast: z.string().optional(),
    observationStations: z.string().optional(),
  }),
});

const forecastSchema = z.object({
  properties: z.object({
    periods: z
      .array(
        z.object({
          number: z.number().optional(),
          isDaytime: z.boolean().optional(),
          temperature: z.number().nullable().optional(),
          temperatureUnit: z.string().optional(),
          shortForecast: z.string().optional(),
          windSpeed: z.string().nullable().optional(),
          probabilityOfPrecipitation: z
            .object({ value: z.number().nullable().optional() })
            .nullable()
            .optional(),
        }),
      )
      .default([]),
  }),
});

const stationsSchema = z.object({
  features: z
    .array(z.object({ properties: z.object({ stationIdentifier: z.string().optional() }) }))
    .default([]),
});

const observationSchema = z.object({
  properties: z.object({
    timestamp: z.string().nullable().optional(),
    textDescription: z.string().nullable().optional(),
    temperature: z.object({ value: z.number().nullable().optional() }).nullable().optional(),
  }),
});

const alertsSchema = z.object({
  features: z
    .array(
      z.object({
        id: z.string().optional(),
        properties: z.object({
          event: z.string().nullable().optional(),
          headline: z.string().nullable().optional(),
          severity: z.string().nullable().optional(),
          ends: z.string().nullable().optional(),
          expires: z.string().nullable().optional(),
        }),
      }),
    )
    .default([]),
});

function celsiusToF(value: number) {
  return Math.round((value * 9) / 5 + 32);
}

/** Only follow NWS-issued URLs that stay on the NWS origin. */
function sameOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.origin === NWS_ORIGIN ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function severityOf(value: string | null | undefined): WeatherAlert["severity"] {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "extreme" || normalized === "severe") return normalized;
  if (normalized === "moderate" || normalized === "minor") return normalized;
  return "unknown";
}

async function loadPoint(lat: number, lng: number) {
  const coords = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  return cached(`nws:point:${coords}`, POINT_TTL, async () => {
    const raw = await fetchJson({ url: `${NWS_ORIGIN}/points/${coords}`, headers: HEADERS });
    const parsed = pointSchema.parse(raw);
    const stationsUrl = sameOrigin(parsed.properties.observationStations);
    let stationId: string | null = null;
    if (stationsUrl) {
      try {
        const stations = stationsSchema.parse(await fetchJson({ url: stationsUrl, headers: HEADERS }));
        stationId = stations.features[0]?.properties.stationIdentifier ?? null;
      } catch {
        stationId = null;
      }
    }
    return { forecastUrl: sameOrigin(parsed.properties.forecast), stationId };
  });
}

async function loadForecast(url: string) {
  return cached(`nws:forecast:${url}`, FORECAST_TTL, async () =>
    forecastSchema.parse(await fetchJson({ url, headers: HEADERS })),
  );
}

async function loadObservation(stationId: string) {
  return cached(`nws:obs:${stationId}`, OBSERVATION_TTL, async () =>
    observationSchema.parse(
      await fetchJson({
        url: `${NWS_ORIGIN}/stations/${encodeURIComponent(stationId)}/observations/latest`,
        headers: HEADERS,
      }),
    ),
  );
}

async function loadAlerts(lat: number, lng: number) {
  const coords = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  return cached(`nws:alerts:${coords}`, ALERT_TTL, async () =>
    alertsSchema.parse(
      await fetchJson({
        url: `${NWS_ORIGIN}/alerts/active?point=${coords}&status=actual`,
        headers: HEADERS,
      }),
    ),
  );
}

/**
 * Returns null rather than throwing: a weather outage must never take the
 * board down, so callers treat absence as "omit the strip".
 */
export async function fetchCommunityWeather({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}): Promise<CommunityWeather | null> {
  let point: { forecastUrl: string | null; stationId: string | null };
  try {
    point = await loadPoint(lat, lng);
  } catch {
    return null;
  }

  const [forecastResult, observationResult, alertsResult] = await Promise.allSettled([
    point.forecastUrl ? loadForecast(point.forecastUrl) : Promise.reject(new Error("no forecast")),
    point.stationId ? loadObservation(point.stationId) : Promise.reject(new Error("no station")),
    loadAlerts(lat, lng),
  ]);

  const periods = forecastResult.status === "fulfilled" ? forecastResult.value.properties.periods : [];
  const current = periods[0];
  const upcoming = periods.slice(0, 2);
  const daytime = upcoming.find((period) => period.isDaytime === true);
  const nighttime = upcoming.find((period) => period.isDaytime === false);

  const observation =
    observationResult.status === "fulfilled" ? observationResult.value.properties : null;
  const observedC = observation?.temperature?.value ?? null;
  const observedTemperatureF = typeof observedC === "number" ? celsiusToF(observedC) : null;

  const shortForecast =
    observation?.textDescription?.trim() || current?.shortForecast?.trim() || "";
  if (!shortForecast && observedTemperatureF === null && !current) return null;

  const alerts: WeatherAlert[] =
    alertsResult.status === "fulfilled"
      ? alertsResult.value.features.slice(0, 2).map((feature, index) => ({
          id: feature.id ?? `alert-${index}`,
          title: (feature.properties.event ?? feature.properties.headline ?? "Weather alert").slice(
            0,
            120,
          ),
          severity: severityOf(feature.properties.severity),
          endsAt: feature.properties.ends ?? feature.properties.expires ?? null,
          url: "https://alerts.weather.gov",
        }))
      : [];

  return {
    observedTemperatureF,
    forecastTemperatureF: typeof current?.temperature === "number" ? current.temperature : null,
    shortForecast: shortForecast.slice(0, 80),
    highF: typeof daytime?.temperature === "number" ? daytime.temperature : null,
    lowF: typeof nighttime?.temperature === "number" ? nighttime.temperature : null,
    precipitationChance: current?.probabilityOfPrecipitation?.value ?? null,
    wind: current?.windSpeed?.trim() || null,
    observedAt: observation?.timestamp ?? null,
    attributionUrl: ATTRIBUTION_URL,
    alerts,
  };
}
