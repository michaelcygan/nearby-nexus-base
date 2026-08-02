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
};

export function communityKeywordsMeta(slug: string, name: string, city: string) {
  const terms = communityKeywords[slug] ?? [name, `${name} ${city}`];
  return { name: "keywords", content: terms.join(", ") };
}
