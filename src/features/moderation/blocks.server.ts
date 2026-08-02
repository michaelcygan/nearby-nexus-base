/**
 * Block checks run with admin credentials on purpose: neither side may query
 * the other's block rows directly, so nobody can probe whether they've been
 * blocked. Callers surface a single neutral message either way.
 */
export async function isBlockedPair(a: string, b: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("blocks")
    .select("id")
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`)
    .limit(1);

  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}
