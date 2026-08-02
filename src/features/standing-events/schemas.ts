import { z } from "zod";

import { standingEventCategories } from "./types";

/** Wall-clock time as typed in the admin form: "19:30". */
const wallClock = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time like 19:30.");

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-08-01.");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const httpsUrl = z
  .string()
  .trim()
  .url("Enter a full URL.")
  .refine((value) => value.startsWith("https://"), "Links must start with https://");

export const standingEventInputSchema = z.object({
  source_key: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens."),
  neighborhood_id: z.string().uuid().nullable(),
  place_id: z.string().uuid().nullable().optional().default(null),
  venue_name: z.string().trim().min(2).max(120),
  venue_address: optionalText(160),
  title: z.string().trim().min(2).max(140),
  description: optionalText(600),
  category: z.enum(
    standingEventCategories as [StandingEventCategory, ...StandingEventCategory[]],
  ),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  start_time: wallClock,
  end_time: wallClock.nullable().optional().default(null),
  end_day_offset: z.union([z.literal(0), z.literal(1)]).default(0),
  timezone: z.string().trim().min(3).max(60).default("America/Chicago"),
  source_url: httpsUrl,
  image_url: httpsUrl.nullable().optional().default(null),
  image_attribution: optionalText(160),
  exception_note: optionalText(300),
  starts_on: isoDate.nullable().optional().default(null),
  ends_on: isoDate.nullable().optional().default(null),
  excluded_dates: z.array(isoDate).max(200).default([]),
  status: z.enum(["draft", "active", "paused"]).default("draft"),
});

export type StandingEventInput = z.infer<typeof standingEventInputSchema>;
