/**
 * Shared plumbing for outbound public-data calls: an in-isolate TTL cache and
 * a timeout-bounded JSON fetch. Kept deliberately small — the runtime has no
 * durable cache primitive, and a database cache would be more moving parts
 * than a neighborhood weather line deserves.
 */

type Entry = { value: unknown; expiresAt: number };

const cache = new Map<string, Entry>();
/** Prevents an unbounded map if many communities are served by one isolate. */
const MAX_ENTRIES = 200;

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const value = await load();
  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export class ExternalRequestError extends Error {}

export async function fetchJson({
  url,
  headers,
  timeoutMs = 4000,
}: {
  url: string;
  headers: Record<string, string>;
  timeoutMs?: number;
}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      throw new ExternalRequestError(`Upstream responded ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new ExternalRequestError(error instanceof Error ? error.message : "Request failed");
  } finally {
    clearTimeout(timer);
  }
}
