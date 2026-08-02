import { useEffect, useState } from "react";

/**
 * True only after the client has hydrated.
 *
 * Ambient Today sections (weather, city data, directory preview) are fetched on
 * the client. Rendering them during SSR would emit markup the client's empty
 * cache cannot reproduce on its first pass, which React reports as a hydration
 * mismatch and then throws away. Gating on this hook keeps the server HTML and
 * the first client render identical: both show the reserved placeholder.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
