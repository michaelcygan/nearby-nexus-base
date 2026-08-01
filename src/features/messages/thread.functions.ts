import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { ThreadDetail, ThreadSummary } from "./types";

const bodySchema = z.string().trim().min(1, "Write a message first.").max(2000);

export const startThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ postId: z.string().uuid(), body: bodySchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, author_id, status")
      .eq("id", data.postId)
      .maybeSingle();
    if (postError) throw new Error(postError.message);
    if (!post) throw new Error("That post no longer exists.");
    if (!post.author_id) throw new Error("This post has no author to message.");
    if (post.author_id === userId) throw new Error("This is your own post.");

    const { data: existing, error: existingError } = await supabase
      .from("threads")
      .select("id")
      .eq("post_id", data.postId)
      .eq("initiator_id", userId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    let threadId = existing?.id ?? null;

    if (!threadId) {
      const { data: created, error: createError } = await supabase
        .from("threads")
        // Both sides are derived server-side: initiator from the session, author from the post.
        .insert({ post_id: data.postId, author_id: post.author_id, initiator_id: userId })
        .select("id")
        .single();
      if (createError) throw new Error(createError.message);
      threadId = created.id;
    }

    const { error: messageError } = await supabase
      .from("thread_messages")
      .insert({ thread_id: threadId, sender_id: userId, body: data.body });
    if (messageError) throw new Error(messageError.message);

    await supabase
      .from("threads")
      .update({ last_message_at: new Date().toISOString(), initiator_last_read_at: new Date().toISOString() })
      .eq("id", threadId);

    return { threadId };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ threadId: z.string().uuid(), body: bodySchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("id, author_id, initiator_id")
      .eq("id", data.threadId)
      .maybeSingle();
    if (threadError) throw new Error(threadError.message);
    if (!thread) throw new Error("That conversation is not available.");

    const { error } = await supabase
      .from("thread_messages")
      .insert({ thread_id: data.threadId, sender_id: userId, body: data.body });
    if (error) throw new Error(error.message);

    const now = new Date().toISOString();
    await supabase
      .from("threads")
      .update(
        thread.author_id === userId
          ? { last_message_at: now, author_last_read_at: now }
          : { last_message_at: now, initiator_last_read_at: now },
      )
      .eq("id", data.threadId);

    return { sent: true as const };
  });

export const markThreadRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ threadId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: thread } = await supabase
      .from("threads")
      .select("id, author_id")
      .eq("id", data.threadId)
      .maybeSingle();
    if (!thread) return { ok: false as const };

    const now = new Date().toISOString();
    await supabase
      .from("threads")
      .update(
        thread.author_id === userId
          ? { author_last_read_at: now }
          : { initiator_last_read_at: now },
      )
      .eq("id", data.threadId);
    return { ok: true as const };
  });

export const listMyThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: threads, error } = await supabase
      .from("threads")
      .select(
        "id, post_id, author_id, initiator_id, author_last_read_at, initiator_last_read_at, last_message_at, posts:post_id(title, neighborhoods:neighborhood_id(slug))",
      )
      .order("last_message_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!threads?.length) return [] as ThreadSummary[];

    const threadIds = threads.map((t) => t.id);
    const otherIds = threads.map((t) => (t.author_id === userId ? t.initiator_id : t.author_id));

    const [{ data: messages }, { data: profiles }] = await Promise.all([
      supabase
        .from("thread_messages")
        .select("thread_id, body, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, display_name").in("id", otherIds),
    ]);

    const latest = new Map<string, { body: string; created_at: string }>();
    for (const message of messages ?? []) {
      if (!latest.has(message.thread_id)) {
        latest.set(message.thread_id, { body: message.body, created_at: message.created_at });
      }
    }
    const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    return threads.map((thread) => {
      const isAuthor = thread.author_id === userId;
      const otherId = isAuthor ? thread.initiator_id : thread.author_id;
      const lastRead = isAuthor ? thread.author_last_read_at : thread.initiator_last_read_at;
      const last = latest.get(thread.id) ?? null;
      const post = thread.posts as unknown as
        | { title: string; neighborhoods: { slug: string } | null }
        | null;

      return {
        id: thread.id,
        post_id: thread.post_id,
        post_title: post?.title ?? "Removed post",
        neighborhood_slug: post?.neighborhoods?.slug ?? "",
        other_id: otherId,
        other_name: names.get(otherId) ?? "Neighbor",
        last_message: last?.body ?? null,
        last_message_at: last?.created_at ?? thread.last_message_at,
        unread: Boolean(
          last && (!lastRead || new Date(last.created_at) > new Date(lastRead)),
        ),
      } satisfies ThreadSummary;
    });
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ threadId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: thread, error } = await supabase
      .from("threads")
      .select(
        "id, post_id, author_id, initiator_id, posts:post_id(title, neighborhoods:neighborhood_id(slug))",
      )
      .eq("id", data.threadId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!thread) return null;

    const { data: messages, error: messageError } = await supabase
      .from("thread_messages")
      .select("id, sender_id, body, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (messageError) throw new Error(messageError.message);

    const isAuthor = thread.author_id === userId;
    const otherId = isAuthor ? thread.initiator_id : thread.author_id;
    const { data: other } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", otherId)
      .maybeSingle();

    const post = thread.posts as unknown as
      | { title: string; neighborhoods: { slug: string } | null }
      | null;

    return {
      id: thread.id,
      post_id: thread.post_id,
      post_title: post?.title ?? "Removed post",
      neighborhood_slug: post?.neighborhoods?.slug ?? "",
      other_id: otherId,
      other_name: other?.display_name ?? "Neighbor",
      viewer_id: userId,
      messages: messages ?? [],
    } satisfies ThreadDetail;
  });
