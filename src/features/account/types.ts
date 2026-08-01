import { z } from "zod";

export type ProfileRecord = {
  id: string;
  display_name: string;
  about: string | null;
  avatar_path: string | null;
  home_neighborhood_id: string | null;
};

export type Profile = ProfileRecord & {
  avatar_url: string | null;
  home_neighborhood: { slug: string; name: string; city: string } | null;
};

export type SavedNeighborhood = {
  id: string;
  neighborhood: { id: string; slug: string; name: string; city: string };
};

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, { message: "Use at least 2 characters." })
    .max(60, { message: "Keep it under 60 characters." }),
  about: z
    .string()
    .trim()
    .max(400, { message: "Keep this under 400 characters." })
    .optional()
    .or(z.literal("")),
  home_neighborhood_id: z.string().uuid().nullable().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address." })
    .max(255, { message: "That email is too long." }),
  password: z
    .string()
    .min(8, { message: "Use at least 8 characters." })
    .max(72, { message: "Keep it under 72 characters." }),
});

export const emailOnlySchema = credentialsSchema.pick({ email: true });

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Use at least 8 characters." })
      .max(72, { message: "Keep it under 72 characters." }),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Those passwords don't match.",
    path: ["confirm"],
  });

export function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
