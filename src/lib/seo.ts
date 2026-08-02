export const SITE_ORIGIN = "https://neighborhood.today";

export function canonicalUrl(path: string) {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Self-referencing canonical link + og:url meta for a leaf route. */
export function canonicalHead(path: string) {
  const href = canonicalUrl(path);
  return {
    meta: [{ property: "og:url", content: href }],
    links: [{ rel: "canonical", href }],
  };
}

/**
 * Search terms a single community board should be findable by. Sub-areas share
 * the one canonical board — we never mint a separate page for them.
 */
const communityKeywords: Record<string, string[]> = {
  "lincoln-park": [
    "Lincoln Park",
    "Lincoln Park Chicago",
    "DePaul neighborhood",
    "Lincoln Park lakefront",
    "Armitage",
    "Lincoln Avenue Chicago",
  ],
  lakeview: [
    "Lakeview",
    "Lake View",
    "Lakeview Chicago",
    "Lakeview East",
    "East Lakeview",
    "Northalsted",
    "Wrigleyville",
    "Wrigley",
  ],
};

export function communityKeywordsMeta(slug: string, name: string, city: string) {
  const terms = communityKeywords[slug] ?? [name, `${name} ${city}`];
  return { name: "keywords", content: terms.join(", ") };
}

/**
 * Quiet secondary context printed under the community name for boards that
 * cover several familiar sub-areas. Not navigation — one line of plain text.
 */
const communitySubareas: Record<string, string[]> = {
  lakeview: ["Lakeview East", "Northalsted", "Wrigleyville"],
};

export function communitySubareaLine(slug: string) {
  const areas = communitySubareas[slug];
  return areas?.length ? areas.join(" · ") : null;
}

/** Per-community description override; otherwise the shared wording. */
const communityDescriptions: Record<string, string> = {
  lakeview:
    "The free public bulletin board for Lakeview, including Lakeview East, Northalsted, and Wrigleyville. Find plans, marketplace posts, requests for help, and useful neighborhood places.",
};

export function communityDescription(slug: string, name: string, city: string) {
  return (
    communityDescriptions[slug] ??
    `The free public bulletin board for ${name}, ${city}. Find neighborhood plans, marketplace posts, requests for help, and useful local places.`
  );
}

