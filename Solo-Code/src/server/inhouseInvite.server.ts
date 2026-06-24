import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueLineNotificationForUser, findUserIdByEmail } from "@/server/lineNotify.server";
import { canonicalUrl } from "@/lib/siteUrl";

const inhouseFrom = (table: string) =>
  (supabaseAdmin as unknown as { from: (t: string) => any }).from(table);

export async function createInhouseInviteWithNotify(opts: {
  orgId: string;
  invitedBy: string;
  role?: string;
  email?: string;
  workspaceIds?: string[];
}) {
  const token =
    crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);

  const { data: invite, error } = await inhouseFrom("inhouse_invites")
    .insert({
      org_id: opts.orgId,
      token,
      email: opts.email ?? null,
      role: opts.role ?? "member",
      workspace_ids: opts.workspaceIds ?? [],
      invited_by: opts.invitedBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { data: org } = await inhouseFrom("inhouse_orgs")
    .select("name")
    .eq("id", opts.orgId)
    .maybeSingle();

  const orgName = (org as { name?: string } | null)?.name ?? "In-House team";

  if (opts.email?.trim()) {
    const inviteeId = await findUserIdByEmail(opts.email);
    if (inviteeId) {
      void enqueueLineNotificationForUser({
        userId: inviteeId,
        kind: "inhouse_invite",
        body: `ทีม ${orgName} เชิญคุณเข้าร่วม In-House workspace`,
        idempotencyKey: `inhouse-invite-${invite.id}`,
        link: canonicalUrl("/inhouse"),
      });
    }
  }

  return invite;
}

export async function notifyInhouseMemberJoin(orgId: string, newMemberId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name, brand_name")
    .eq("user_id", newMemberId)
    .maybeSingle();

  const memberName = profile?.brand_name || profile?.display_name || "สมาชิกใหม่";

  const { data: org } = await inhouseFrom("inhouse_orgs")
    .select("name, owner_id")
    .eq("id", orgId)
    .maybeSingle();

  const orgName = (org as { name?: string; owner_id?: string } | null)?.name ?? "ทีม";
  const ownerId = (org as { owner_id?: string } | null)?.owner_id;

  const { data: admins } = await inhouseFrom("inhouse_org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .in("role", ["admin", "owner"]);

  const notifyIds = new Set<string>();
  if (ownerId && ownerId !== newMemberId) notifyIds.add(ownerId);
  for (const row of admins ?? []) {
    const uid = (row as { user_id: string }).user_id;
    if (uid !== newMemberId) notifyIds.add(uid);
  }

  for (const adminId of notifyIds) {
    void enqueueLineNotificationForUser({
      userId: adminId,
      kind: "inhouse_member_join",
      body: `${memberName} เข้าร่วมทีม ${orgName} แล้ว`,
      idempotencyKey: `inhouse-join-${orgId}-${newMemberId}`,
      link: canonicalUrl("/inhouse"),
    });
  }
}

export async function acceptInhouseInviteWithNotify(
  token: string,
  userId: string,
  userSupabase: {
    rpc: (
      fn: string,
      args: Record<string, string>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  },
) {
  const { data: orgId, error } = await userSupabase.rpc("accept_inhouse_invite", { _token: token });
  if (error) throw new Error(error.message);

  await notifyInhouseMemberJoin(orgId as string, userId);
  return orgId as string;
}

export const CreateInhouseInviteSchema = z.object({
  orgId: z.string().uuid(),
  role: z.enum(["member", "admin", "viewer", "owner"]).optional(),
  email: z.string().optional(),
  workspaceIds: z.array(z.string().uuid()).optional(),
});

export const AcceptInhouseInviteSchema = z.object({
  token: z.string().min(1),
});
