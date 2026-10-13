import { fromTable, supabase } from "@/integrations/supabase/client";
import {
  fetchMutualFollowCandidates,
  type TaggedUserSummary,
} from "@/lib/communityTaggedUsers";

export const MAX_PORTFOLIO_COLLAB_USERS = 19;

export type ProjectCollabInvite = {
  id: string;
  project_id: string;
  invited_user_id: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  created_at: string;
  responded_at: string | null;
};

export async function fetchProjectCollabInvites(projectId: string): Promise<ProjectCollabInvite[]> {
  const { data, error } = await supabase
    .from("project_collab_invites")
    .select("id, project_id, invited_user_id, invited_by, status, created_at, responded_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectCollabInvite[];
}

export async function fetchMyPendingCollabInvites(userId: string): Promise<ProjectCollabInvite[]> {
  const { data, error } = await supabase
    .from("project_collab_invites")
    .select("id, project_id, invited_user_id, invited_by, status, created_at, responded_at")
    .eq("invited_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectCollabInvite[];
}

type LooseRpc = (name: string, args?: object) => ReturnType<typeof supabase.rpc>;
const rpc = (name: string, args?: object) => (supabase.rpc as unknown as LooseRpc)(name, args);

/**
 * People the signed-in user may tag right now: mutual follows, who allow tags, with no block
 * either way (the database decides). Null when that check is not deployed yet.
 */
async function fetchTaggableIds(): Promise<Set<string> | null> {
  const { data, error } = await rpc("list_taggable_collaborators");
  if (error || !Array.isArray(data)) return null;
  return new Set(
    (data as unknown[]).map((row) =>
      typeof row === "string" ? row : String((row as Record<string, unknown>).list_taggable_collaborators ?? ""),
    ),
  );
}

/** Mutual follows the user is allowed to tag on a work. */
export async function fetchTaggableCollabCandidates(userId: string): Promise<TaggedUserSummary[]> {
  const [candidates, taggable] = await Promise.all([fetchMutualFollowCandidates(userId), fetchTaggableIds()]);
  return taggable ? candidates.filter((c) => taggable.has(c.user_id)) : candidates;
}

export async function resolveCollabUserIds(
  ownerId: string,
  ids: string[] | undefined,
): Promise<string[]> {
  const unique = Array.from(new Set(ids ?? [])).filter((id) => id !== ownerId);
  if (!unique.length) return [];

  const candidates = await fetchTaggableCollabCandidates(ownerId);
  const allowed = new Set(candidates.map((c) => c.user_id));
  const valid = unique.filter((id) => allowed.has(id));
  if (valid.length !== unique.length) {
    throw new Error("แท็กได้เฉพาะคนที่ติดตามกันทั้งคู่และเปิดให้แท็ก");
  }
  return valid;
}

/**
 * Create invites for newly tagged people. The database tells them (only once the work is
 * Published) and tells the poster when they accept or decline. A decline is final for that
 * work, so the poster cannot re-tag the same person over and over.
 */
export async function syncProjectCollabInvites(input: {
  projectId: string;
  ownerId: string;
  desiredUserIds: string[];
  acceptedUserIds: string[];
}): Promise<void> {
  const accepted = new Set(input.acceptedUserIds);
  const uniqueDesired = Array.from(new Set(input.desiredUserIds)).filter(
    (id) => id !== input.ownerId,
  );
  if (uniqueDesired.length > MAX_PORTFOLIO_COLLAB_USERS) {
    throw new Error(`เพิ่มผู้ร่วมงานได้สูงสุด ${MAX_PORTFOLIO_COLLAB_USERS} คน`);
  }

  // Accepted collaborators were verified by their source flow (accepted invite/request
  // or a collab group membership). Only new invitees need the mutual-follow gate.
  const target = await resolveCollabUserIds(
    input.ownerId,
    uniqueDesired.filter((id) => !accepted.has(id)),
  );
  if (!target.length) return;

  const existing = await fetchProjectCollabInvites(input.projectId);
  const invitedAlready = new Set(existing.map((i) => i.invited_user_id));
  const toInvite = target.filter((id) => !invitedAlready.has(id));
  if (!toInvite.length) return;

  const { error } = await supabase.from("project_collab_invites").insert(
    toInvite.map((invited_user_id) => ({
      project_id: input.projectId,
      invited_user_id,
      invited_by: input.ownerId,
      status: "pending",
    })),
  );
  if (error) throw error;
}

export async function respondProjectCollabInvite(inviteId: string, accept: boolean): Promise<void> {
  const { error } = await rpc("respond_project_collab_invite", { _invite_id: inviteId, _accept: accept });
  if (error) throw error;
}

/** Take your own name off a work you were credited on. The poster is told. */
export async function withdrawProjectCollab(projectId: string): Promise<void> {
  const { error } = await rpc("withdraw_project_collab", { _project_id: projectId });
  if (error) throw error;
}

/** Poster cancels a tag nobody has answered yet (they can tag that person again later). */
export async function cancelProjectCollabInvite(inviteId: string): Promise<void> {
  const { error } = await rpc("cancel_project_collab_invite", { _invite_id: inviteId });
  if (error) throw error;
}

export type CollabTagPermission = "mutual" | "nobody";

/** "Who can tag me" — private to its owner. Defaults to mutual follows. */
export async function fetchCollabTagPermission(userId: string): Promise<CollabTagPermission> {
  const { data, error } = await fromTable("collab_tag_settings")
    .select("allow")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return "mutual";
  return (data as { allow?: string }).allow === "nobody" ? "nobody" : "mutual";
}

export async function saveCollabTagPermission(userId: string, allow: CollabTagPermission): Promise<void> {
  const { error } = await fromTable("collab_tag_settings")
    .upsert({ user_id: userId, allow, updated_at: new Date().toISOString() } as never, { onConflict: "user_id" });
  if (error) throw error;
}

export function collabUsersFromInvites(
  invites: ProjectCollabInvite[],
  profiles: TaggedUserSummary[],
): {
  accepted: TaggedUserSummary[];
  pending: TaggedUserSummary[];
} {
  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
  const accepted: TaggedUserSummary[] = [];
  const pending: TaggedUserSummary[] = [];

  for (const inv of invites) {
    const p = profileMap.get(inv.invited_user_id);
    if (!p) continue;
    if (inv.status === "accepted") accepted.push(p);
    else if (inv.status === "pending") pending.push(p);
  }
  return { accepted, pending };
}
