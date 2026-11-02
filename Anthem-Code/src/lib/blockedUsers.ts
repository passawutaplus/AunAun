import { supabase } from "@/integrations/supabase/client";

/**
 * Two-way blocking: if either person blocked the other, neither sees or contacts the other.
 * RLS on user_blocks only shows rows the viewer created, so the reverse direction comes from
 * SECURITY DEFINER RPCs (migration 20261102100000_two_way_user_blocks). Until that migration is
 * applied the RPCs fail, and we fall back to the viewer's own blocks.
 */
type BlocksClient = Pick<typeof supabase, "rpc" | "from">;

export const EMPTY_BLOCKED: ReadonlySet<string> = new Set();

/** Every user id the viewer has blocked or been blocked by. */
export async function fetchBlockedUserIds(
  userId: string,
  client: BlocksClient = supabase,
): Promise<Set<string>> {
  const { data, error } = await client.rpc("get_blocked_user_ids" as never);
  if (!error && Array.isArray(data)) {
    return new Set(
      (data as unknown[])
        .map((r) => (typeof r === "string" ? r : (r as Record<string, unknown>)?.get_blocked_user_ids))
        .filter((id): id is string => typeof id === "string" && id !== userId),
    );
  }
  const { data: own, error: ownErr } = await client
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);
  if (ownErr) throw ownErr;
  return new Set(((own ?? []) as { blocked_id: string }[]).map((r) => r.blocked_id));
}

/** True when either user has blocked the other. */
export async function isBlockedBetween(
  actorId: string,
  targetUserId: string,
  client: BlocksClient = supabase,
): Promise<boolean> {
  const { data, error } = await client.rpc("is_blocked_with" as never, { _other: targetUserId } as never);
  if (!error && typeof data === "boolean") return data;
  const { data: rows, error: rowsErr } = await client
    .from("user_blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${actorId},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${actorId})`,
    )
    .limit(1);
  if (rowsErr) throw rowsErr;
  return (rows ?? []).length > 0;
}

/** Drops items whose owner is in the blocked set. */
export function withoutBlocked<T>(
  items: readonly T[],
  blocked: ReadonlySet<string> | undefined,
  ownerOf: (item: T) => string | null | undefined,
): T[] {
  if (!blocked || blocked.size === 0) return items as T[];
  return items.filter((item) => {
    const owner = ownerOf(item);
    return !owner || !blocked.has(owner);
  });
}
