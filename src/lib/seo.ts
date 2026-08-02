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
