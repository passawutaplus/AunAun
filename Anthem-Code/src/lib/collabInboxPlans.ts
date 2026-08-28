/** Collab inbox "เอกสาร" = persisted collab plan after accept, not invite attachments. */

export type CollabInboxConversationRef = {
  id: string;
  request_id: string | null;
};

/**
 * Map collab request id → conversation id when a `collab_plans` row exists.
 * Pending invites and accepted collabs without a saved plan stay out of the map.
 */
export function mapCollabRequestIdsWithPlans(
  conversations: CollabInboxConversationRef[],
  planConversationIds: Iterable<string>,
): Record<string, string> {
  const planned = new Set(
    [...planConversationIds].filter((id) => typeof id === "string" && id.length > 0),
  );
  const map: Record<string, string> = {};
  for (const conv of conversations) {
    if (!conv.id || !conv.request_id) continue;
    if (!planned.has(conv.id)) continue;
    map[conv.request_id] = conv.id;
  }
  return map;
}
