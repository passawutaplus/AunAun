import { supabase } from "@/integrations/supabase/client";
import { notifyCommunityEvent } from "@/lib/communityNotify";
import {
  fetchMutualFollowCandidates,
  type TaggedUserSummary,
} from "@/lib/communityTaggedUsers";

export const MAX_PORTFOLIO_COLLAB_USERS = 5;

export type ProjectCollabInvite = {
  id: string;
  project_id: string;
  invited_user_id: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
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

export async function resolveCollabUserIds(
  ownerId: string,
  ids: string[] | undefined,
): Promise<string[]> {
  const unique = Array.from(new Set(ids ?? [])).filter((id) => id !== ownerId);
  if (!unique.length) return [];

  const candidates = await fetchMutualFollowCandidates(ownerId);
  const allowed = new Set(candidates.map((c) => c.user_id));
  const valid = unique.filter((id) => allowed.has(id));
  if (valid.length !== unique.length) {
    throw new Error("แท็กได้เฉพาะคนที่ติดตามกันและกัน");
  }
  return valid;
}

export async function syncProjectCollabInvites(input: {
  projectId: string;
  ownerId: string;
  ownerName: string;
  projectTitle: string;
  desiredUserIds: string[];
  acceptedUserIds: string[];
}): Promise<void> {
  const desired = await resolveCollabUserIds(input.ownerId, input.desiredUserIds);
  const accepted = new Set(input.acceptedUserIds);
  const target = desired.filter((id) => !accepted.has(id));

  const existing = await fetchProjectCollabInvites(input.projectId);
  const existingByUser = new Map(existing.map((i) => [i.invited_user_id, i]));

  const toInvite = target.filter((id) => {
    const row = existingByUser.get(id);
    return !row || row.status === "declined";
  });

  if (!toInvite.length) return;

  const inserted: { id: string; invited_user_id: string }[] = [];

  for (const invited_user_id of toInvite) {
    const prev = existingByUser.get(invited_user_id);
    if (prev?.status === "declined") {
      const { data, error: uErr } = await supabase
        .from("project_collab_invites")
        .update({ status: "pending", responded_at: null })
        .eq("id", prev.id)
        .select("id, invited_user_id")
        .single();
      if (uErr) throw uErr;
      if (data) inserted.push(data);
      continue;
    }
    const { data, error: iErr } = await supabase
      .from("project_collab_invites")
      .insert({
        project_id: input.projectId,
        invited_user_id,
        invited_by: input.ownerId,
        status: "pending",
      })
      .select("id, invited_user_id")
      .single();
    if (iErr) throw iErr;
    if (data) inserted.push(data);
  }

  const link = `/portfolio/${input.projectId}`;
  await Promise.all(
    (inserted ?? []).map((inv) =>
      notifyCommunityEvent({
        recipientId: inv.invited_user_id,
        kind: "project_collab_invite",
        title: "เชิญร่วมงานในผลงาน",
        body: `${input.ownerName} แท็กคุณในผลงาน "${input.projectTitle}"`,
        link,
        metadata: {
          invite_id: inv.id,
          project_id: input.projectId,
          status: "pending",
        },
      }),
    ),
  );
}

export async function respondProjectCollabInvite(inviteId: string, accept: boolean): Promise<void> {
  const { error } = await (supabase.rpc as (name: string, args: object) => ReturnType<typeof supabase.rpc>)(
    "respond_project_collab_invite",
    { _invite_id: inviteId, _accept: accept },
  );
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
