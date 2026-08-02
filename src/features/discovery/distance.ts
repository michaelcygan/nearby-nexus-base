/**
 * Pure distance math for community-to-community discovery.
 *
 * Neighborhood Today never asks the browser for a location. Radius is always
 * measured between the *centers of two communities*, on the server. This file
 * has no dependencies on purpose — it is the only place distance is computed,
 * and it can be swapped for PostGIS later without touching callers.
 */

export type Coordinates = { lat: number; lng: number };

const EARTH_RADIUS_MILES = 3958.7613;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function isValidCoordinates(value: {
  lat: number | null | undefined;
  lng: number | null | undefined;
}): value is Coordinates {
  const { lat, lng } = value;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Great-circle distance in statute miles. */
export function haversineMiles(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Inclusive radius test — a community exactly at the boundary is included. */
export function withinRadius(a: Coordinates, b: Coordinates, radiusMiles: number): boolean {
  return haversineMiles(a, b) <= radiusMiles;
}

/** "2.4" — one decimal place, the only distance format shown in the UI. */
export function formatMiles(miles: number): string {
  return miles.toFixed(1);
}
