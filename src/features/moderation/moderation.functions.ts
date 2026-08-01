import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type {
  MemberRow,
  ModerationLogEntry,
  ModerationQueueItem,
  ReportStatus,
  ReportTarget,
} from "./types";

type AuthedContext = {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" | "moderator" | "member" },
    ) => Promise<{ data: unknown }>;
  };
  userId: string;
};

/** Role checks run through the caller's own RLS-scoped client, never service role. */
async function readRoles(context: AuthedContext) {
  const [{ data: isAdmin }, { data: isModerator }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "moderator" }),
  ]);
  return { isAdmin: isAdmin === true, isModerator: isModerator === true };
}

async function requireModerator(context: AuthedContext) {
  const roles = await readRoles(context);
  if (!roles.isAdmin && !roles.isModerator) {
    throw new Error("Forbidden: this area is for moderators.");
  }
  return roles;
}

async function requireAdmin(context: AuthedContext) {
  const roles = await readRoles(context);
  if (!roles.isAdmin) throw new Error("Forbidden: this area is for admins.");
  return roles;
}

export const getMyModerationRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await readRoles(context as never);
    return { ...roles, canModerate: roles.isAdmin || roles.isModerator };
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ status: z.enum(["open", "dismissed", "actioned"]).default("open") })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireModerator(context as never);
    const { supabase } = context;

    const { data: reports, error } = await supabase
      .from("reports")
      .select("id, reporter_id, target_type, target_id, reason, note, status, created_at")
      .eq("status", data.status)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const rows = reports ?? [];
    if (rows.length === 0) return [] as ModerationQueueItem[];

    const idsFor = (type: ReportTarget) =>
      rows.filter((row) => row.target_type === type).map((row) => row.target_id);

    const postIds = idsFor("post");
    const placeIds = idsFor("place");
    const profileIds = idsFor("profile");

    const [{ data: posts }, { data: places }, { data: profiles }] = await Promise.all([
      postIds.length
        ? supabase
            .from("posts")
            .select("id, title, body, hidden, status, neighborhoods:neighborhood_id(slug)")
            .in("id", postIds)
        : Promise.resolve({ data: [] as never[] }),
      placeIds.length
        ? supabase
            .from("places")
            .select("id, name, description, hidden, removed, neighborhoods:neighborhood_id(slug)")
            .in("id", placeIds)
        : Promise.resolve({ data: [] as never[] }),
      profileIds.length
        ? supabase.from("profiles").select("id, display_name, about").in("id", profileIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const postMap = new Map((posts ?? []).map((p) => [p.id, p]));
    const placeMap = new Map((places ?? []).map((p) => [p.id, p]));
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return rows.map((row) => {
      let preview: ModerationQueueItem["preview"] = {
        title: "Content unavailable",
        detail: null,
        hidden: false,
        removed: false,
        link: null,
        placeLink: null,
        profileId: null,
      };

      if (row.target_type === "post") {
        const post = postMap.get(row.target_id);
        if (post) {
          const slug = (post.neighborhoods as { slug: string } | null)?.slug ?? null;
          preview = {
            title: post.title,
            detail: post.body.slice(0, 240),
            hidden: post.hidden,
            removed: post.status === "removed",
            link: slug ? { slug, postId: post.id } : null,
            placeLink: null,
            profileId: null,
          };
        }
      } else if (row.target_type === "place") {
        const place = placeMap.get(row.target_id);
        if (place) {
          const slug = (place.neighborhoods as { slug: string } | null)?.slug ?? null;
          preview = {
            title: place.name,
            detail: place.description?.slice(0, 240) ?? null,
            hidden: place.hidden,
            removed: place.removed,
            link: null,
            placeLink: slug ? { slug, placeId: place.id } : null,
            profileId: null,
          };
        }
      } else if (row.target_type === "profile") {
        const profile = profileMap.get(row.target_id);
        if (profile) {
          preview = {
            title: profile.display_name,
            detail: profile.about?.slice(0, 240) ?? null,
            hidden: false,
            removed: false,
            link: null,
            placeLink: null,
            profileId: profile.id,
          };
        }
      } else {
        preview = {
          title: "Private conversation",
          detail: "Message contents stay private; act on the neighbor or the post instead.",
          hidden: false,
          removed: false,
          link: null,
          placeLink: null,
          profileId: null,
        };
      }

      return {
        id: row.id,
        reporter_id: row.reporter_id,
        target_type: row.target_type as ReportTarget,
        target_id: row.target_id,
        reason: row.reason,
        note: row.note,
        status: row.status as ReportStatus,
        created_at: row.created_at,
        preview,
      } satisfies ModerationQueueItem;
    });
  });

export const actOnReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        action: z.enum(["dismiss", "hide", "remove", "restore"]),
        reason: z.string().trim().max(300).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireModerator(context as never);
    const { supabase, userId } = context;

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("id, target_type, target_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (reportError) throw new Error(reportError.message);
    if (!report) throw new Error("That report is no longer available.");

    const targetType = report.target_type as ReportTarget;

    if (data.action !== "dismiss") {
      if (targetType === "post") {
        const patch =
          data.action === "hide"
            ? { hidden: true }
            : data.action === "remove"
              ? { hidden: true, status: "removed" as const }
              : { hidden: false, status: "active" as const };
        const { error } = await supabase.from("posts").update(patch).eq("id", report.target_id);
        if (error) throw new Error(error.message);
      } else if (targetType === "place") {
        const patch =
          data.action === "hide"
            ? { hidden: true }
            : data.action === "remove"
              ? { hidden: true, removed: true }
              : { hidden: false, removed: false };
        const { error } = await supabase.from("places").update(patch).eq("id", report.target_id);
        if (error) throw new Error(error.message);
      } else {
        throw new Error("Neighbors and conversations can't be hidden — dismiss or handle by role.");
      }
    }

    const { error: logError } = await supabase.from("moderation_actions").insert({
      actor_id: userId,
      action: data.action,
      target_type: targetType,
      target_id: report.target_id,
      report_id: report.id,
      reason: data.reason ? data.reason : null,
    });
    if (logError) throw new Error(logError.message);

    const { error: closeError } = await supabase
      .from("reports")
      .update({
        status: data.action === "dismiss" ? "dismissed" : "actioned",
        resolution: data.reason ? data.reason : null,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", report.id);
    if (closeError) throw new Error(closeError.message);

    return { action: data.action };
  });

export const listModerationLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireModerator(context as never);
    const { supabase } = context;

    const { data, error } = await supabase
      .from("moderation_actions")
      .select("id, actor_id, action, target_type, target_id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    if (rows.length === 0) return [] as ModerationLogEntry[];

    const { data: actors } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in(
        "id",
        rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)),
      );
    const names = new Map((actors ?? []).map((a) => [a.id, a.display_name]));

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      target_type: row.target_type as ReportTarget,
      target_id: row.target_id,
      reason: row.reason,
      created_at: row.created_at,
      actor_name: row.actor_id ? (names.get(row.actor_id) ?? "Moderator") : "Moderator",
    })) satisfies ModerationLogEntry[];
  });

export const searchMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ query: z.string().trim().max(60).default("") }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { supabase } = context;

    let profileQuery = supabase.from("profiles").select("id, display_name").order("display_name");
    if (data.query) profileQuery = profileQuery.ilike("display_name", `%${data.query}%`);

    const { data: profiles, error } = await profileQuery.limit(40);
    if (error) throw new Error(error.message);

    const rows = profiles ?? [];
    if (rows.length === 0) return [] as MemberRow[];

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in(
        "user_id",
        rows.map((row) => row.id),
      );

    const roleMap = new Map<string, MemberRow["roles"]>();
    for (const row of roleRows ?? []) {
      const list = roleMap.get(row.user_id) ?? [];
      list.push(row.role);
      roleMap.set(row.user_id, list);
    }

    return rows.map((row) => ({
      id: row.id,
      display_name: row.display_name,
      roles: roleMap.get(row.id) ?? [],
    })) satisfies MemberRow[];
  });

export const setMemberModerator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), grant: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const { supabase } = context;

    if (data.userId === context.userId) {
      throw new Error("You can't change your own roles.");
    }

    if (data.grant) {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "moderator" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "moderator");
      if (error) throw new Error(error.message);
    }

    return { grant: data.grant };
  });
