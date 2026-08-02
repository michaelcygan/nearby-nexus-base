/**
 * Communities live at the root of the site (`/edgewater`), so every top-level
 * static path has to be protected from being claimed as a community slug.
 *
 * When you add a new top-level route under `src/routes/`, add its first path
 * segment here too.
 */
export const RESERVED_SLUGS = new Set([
  "a",
  "admin",
  "api",
  "assets",
  "auth",
  "community-guidelines",
  "favicon.ico",
  "guidelines",
  "messages",
  "n",
  "orders",
  "post",
  "posts",
  "privacy",
  "profile",
  "reset-password",
  "robots.txt",
  "sitemap.xml",
  "store",
  "terms",
  "u",
]);

export function isReservedSlug(slug: string) {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/** Community slugs are lowercase words separated by single hyphens. */
export function isValidCommunitySlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 120 && !isReservedSlug(slug);
}
