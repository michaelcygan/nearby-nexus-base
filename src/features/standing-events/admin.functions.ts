import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { ADMIN_COLUMNS, normalizeAdminRow, requireAdmin, toDatabaseTime } from "./admin.server";
import { standingEventInputSchema } from "./schemas";

/**
 * Admin CRUD for curated standing events. Every handler re-checks the admin
 * role through the caller's own RLS-scoped client, so being signed in is never
 * enough on its own.
 */

export const listAdminStandingEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ neighborhoodId: z.string().uuid().nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    let query = context.supabase.from("standing_events").select(ADMIN_COLUMNS);
    query = data.neighborhoodId
      ? query.eq("neighborhood_id", data.neighborhoodId)
      : query.is("neighborhood_id", null);
    const { data: rows, error } = await query.order("venue_name").order("title");
    if (error) throw new Error(error.message);
    return (rows ?? []).map(normalizeAdminRow);
  });

export const saveStandingEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ eventId: z.string().uuid().nullable(), values: standingEventInputSchema })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const payload = {
      ...data.values,
      start_time: toDatabaseTime(data.values.start_time)!,
      end_time: toDatabaseTime(data.values.end_time ?? null),
    };

    if (data.eventId) {
      const { error } = await context.supabase
        .from("standing_events")
        .update(payload)
        .eq("id", data.eventId);
      if (error) throw new Error(error.message);
      return { id: data.eventId };
    }

    const { data: created, error } = await context.supabase
      .from("standing_events")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const setStandingEventStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        status: z.enum(["draft", "active", "paused"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { error } = await context.supabase
      .from("standing_events")
      .update({ status: data.status })
      .eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Records that a human re-checked the venue's page today. */
export const verifyStandingEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase
      .from("standing_events")
      .update({ last_verified_at: today, verified_by: context.userId })
      .eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { last_verified_at: today };
  });

/** Records that the linked image was reviewed and approved today. */
export const verifyStandingEventImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase
      .from("standing_events")
      .update({ image_verified_at: today })
      .eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { image_verified_at: today };
  });

export const deleteStandingEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { error } = await context.supabase
      .from("standing_events")
      .delete()
      .eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Fetches a venue's page and extracts Open Graph / Twitter Card image URLs.
 * Admins must explicitly approve a discovered image before it is stored.
 */
export const discoverStandingEventImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ sourceUrl: z.string().url() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const candidates = await fetchImageCandidates(data.sourceUrl);
    return { candidates };
  });

async function fetchImageCandidates(url: string): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Neighborhood Today Image Discovery Bot (+https://neighborhood.today)",
        Accept: "text/html",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) throw new Error("Source did not return HTML");
    const html = await response.text();
    return extractImageCandidates(html, url);
  } finally {
    clearTimeout(timeout);
  }
}

function extractImageCandidates(html: string, baseUrl: string): string[] {
  const maxBytes = 500_000;
  const truncated = html.slice(0, maxBytes);
  const candidates = new Set<string>();
  const tags = [
    ["property", "og:image"],
    ["name", "twitter:image"],
    ["property", "og:image:secure_url"],
  ] as const;

  for (const [attr, value] of tags) {
    const candidate = extractMetaContent(truncated, attr, value);
    if (candidate) {
      const resolved = resolveUrl(baseUrl, candidate);
      if (isSafeImageUrl(resolved)) candidates.add(resolved);
    }
  }

  return [...candidates].slice(0, 5);
}

function extractMetaContent(html: string, attr: string, value: string): string | null {
  const attrFirst = new RegExp(
    `<meta[^>]+(?:${attr})="${escapeRegex(value)}"[^>]+content="([^"]+)"`,
    "i",
  );
  const contentFirst = new RegExp(
    `<meta[^>]+content="([^"]+)"[^>]+(?:${attr})="${escapeRegex(value)}"`,
    "i",
  );
  return attrFirst.exec(html)?.[1] ?? contentFirst.exec(html)?.[1] ?? null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveUrl(baseUrl: string, candidate: string): string {
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return new URL(candidate, baseUrl).toString();
}

function isSafeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}
