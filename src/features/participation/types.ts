import type { PostType } from "@/features/neighborhoods/types";

export type ParticipationRole = "going" | "volunteer" | "interested";

export type MyParticipation = {
  id: string;
  post_id: string;
  role: ParticipationRole;
  note: string | null;
  created_at: string;
  post: {
    id: string;
    title: string;
    type: PostType;
    starts_at: string | null;
    needed_by: string | null;
    neighborhood_slug: string;
    neighborhood_name: string;
  } | null;
};

export type PostParticipant = {
  id: string;
  user_id: string;
  role: ParticipationRole;
  note: string | null;
  created_at: string;
  display_name: string;
};

/** Which role a given post type signs neighbors up as. */
export function roleForPostType(type: PostType): ParticipationRole {
  if (type === "plan") return "going";
  if (type === "volunteer") return "volunteer";
  return "interested";
}

export const roleLabels: Record<ParticipationRole, string> = {
  going: "Going",
  volunteer: "Volunteering",
  interested: "Interested",
};
