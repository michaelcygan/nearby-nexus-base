import { z } from "zod";

export const POST_TYPES = ["bulletin", "plan", "marketplace", "volunteer"] as const;
export const MAX_POST_IMAGES = 4;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((value) => value || null);

const optionalCount = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "" || value === null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  })
  .refine((value) => value === null || (value > 0 && value <= 10000), {
    message: "Enter a number between 1 and 10000.",
  });

const optionalTimestamp = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? new Date(value).toISOString() : null));

export const postInputSchema = z
  .object({
    neighborhood_id: z.string().uuid(),
    type: z.enum(POST_TYPES),
    title: z
      .string()
      .trim()
      .min(4, { message: "Use at least 4 characters." })
      .max(120, { message: "Keep the title under 120 characters." }),
    body: z
      .string()
      .trim()
      .min(20, { message: "Add at least 20 characters so neighbors know what's going on." })
      .max(4000, { message: "Keep this under 4000 characters." }),
    image_paths: z.array(z.string().min(1).max(400)).max(MAX_POST_IMAGES).default([]),
    // plan
    starts_at: optionalTimestamp,
    location: optionalText(160),
    capacity: optionalCount,
    // marketplace
    price: optionalText(20),
    is_free: z.boolean().default(false),
    condition: optionalText(60),
    // volunteer
    needed_by: optionalTimestamp,
    slots: optionalCount,
  })
  .superRefine((values, ctx) => {
    if (values.type === "plan" && !values.starts_at) {
      ctx.addIssue({ code: "custom", path: ["starts_at"], message: "Plans need a date and time." });
    }
    if (values.type === "marketplace") {
      if (!values.is_free) {
        const amount = Number(values.price);
        if (!values.price || !Number.isFinite(amount) || amount < 0) {
          ctx.addIssue({
            code: "custom",
            path: ["price"],
            message: "Enter a price, or mark the listing free.",
          });
        }
      }
    }
    if (values.type === "volunteer" && !values.needed_by && values.slots === null) {
      ctx.addIssue({
        code: "custom",
        path: ["needed_by"],
        message: "Add a needed-by date or how many people you need.",
      });
    }
  });

export type PostInput = z.infer<typeof postInputSchema>;

/** Maps validated form input onto the columns the posts table expects. */
export function toPostRow(input: PostInput) {
  const isMarketplace = input.type === "marketplace";
  const priceCents =
    isMarketplace && !input.is_free && input.price
      ? Math.round(Number(input.price) * 100)
      : isMarketplace && input.is_free
        ? 0
        : null;

  return {
    neighborhood_id: input.neighborhood_id,
    type: input.type,
    title: input.title,
    body: input.body,
    image_paths: input.image_paths,
    starts_at: input.type === "plan" ? input.starts_at : null,
    // Location and Place are universal: they are not cleared when the mode changes.
    location: input.location,
    capacity: input.type === "plan" ? input.capacity : null,
    price_cents: priceCents,
    is_free: isMarketplace ? input.is_free : null,
    condition: isMarketplace ? input.condition : null,
    needed_by: input.type === "volunteer" ? input.needed_by : null,
    slots: input.type === "volunteer" ? input.slots : null,
  };
}

export const placeInputSchema = z.object({
  neighborhood_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  address: optionalText(180),
  description: optionalText(600),
  website: optionalText(300),
  phone: optionalText(40),
  hours: optionalText(180),
});

export type PlaceInput = z.infer<typeof placeInputSchema>;
