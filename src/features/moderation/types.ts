import { z } from "zod";

export type ReportTarget = "post" | "place" | "profile" | "thread" | "store_listing";
export type ReportReason = "spam" | "unsafe" | "wrong_board" | "not_neighborly" | "other";
export type ReportStatus = "open" | "dismissed" | "actioned";
export type ModerationActionKind = "dismiss" | "hide" | "remove" | "restore";

export const reportTargets = ["post", "place", "profile", "thread", "store_listing"] as const;
export const reportReasons = ["spam", "unsafe", "wrong_board", "not_neighborly", "other"] as const;

export const reportReasonLabels: Record<ReportReason, string> = {
  spam: "Spam or a scam",
  unsafe: "Unsafe or threatening",
  wrong_board: "Posted on the wrong board",
  not_neighborly: "Not neighborly",
  other: "Something else",
};

export const reportTargetLabels: Record<ReportTarget, string> = {
  post: "Post",
  place: "Directory listing",
  profile: "Neighbor",
  thread: "Conversation",
  store_listing: "Store item",
};

export const reportStatusLabels: Record<ReportStatus, string> = {
  open: "Open",
  dismissed: "Dismissed",
  actioned: "Acted on",
};

export const moderationActionLabels: Record<ModerationActionKind, string> = {
  dismiss: "Dismissed",
  hide: "Hidden",
  remove: "Removed",
  restore: "Restored",
};

export const reportSchema = z.object({
  target_type: z.enum(reportTargets),
  target_id: z.string().uuid(),
  reason: z.enum(reportReasons),
  note: z
    .string()
    .trim()
    .max(500, { message: "Keep this under 500 characters." })
    .optional()
    .or(z.literal("")),
});

export type ReportInput = z.infer<typeof reportSchema>;

export type MyReport = {
  id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  created_at: string;
};

export type BlockedNeighbor = {
  id: string;
  blocked_id: string;
  display_name: string;
  created_at: string;
};

export type ModerationQueueItem = MyReport & {
  reporter_id: string;
  preview: {
    title: string;
    detail: string | null;
    hidden: boolean;
    removed: boolean;
    link: { slug: string; postId: string } | null;
    placeLink: { slug: string; placeId: string } | null;
    storeLink?: { slug: string; listingId: string } | null;
    profileId: string | null;
  };
};

export type ModerationLogEntry = {
  id: string;
  action: ModerationActionKind;
  target_type: ReportTarget;
  target_id: string;
  reason: string | null;
  created_at: string;
  actor_name: string;
};

export type MemberRow = {
  id: string;
  display_name: string;
  roles: Array<"admin" | "moderator" | "member">;
};
