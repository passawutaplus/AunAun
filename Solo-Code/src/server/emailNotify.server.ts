import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTemplateEmail } from "@/server/portalEmail.server";
import { canonicalUrl } from "@/lib/siteUrl";

export async function getUserEmailById(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

export async function getFreelancerDisplayName(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("brand_name, display_name")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.brand_name || data?.display_name || "คุณ";
}

export async function notifyFreelancer(opts: {
  userId: string;
  templateName: string;
  templateData: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const email = await getUserEmailById(opts.userId);
  if (!email) return { ok: false, reason: "no_email" };
  return enqueueTemplateEmail({
    templateName: opts.templateName,
    recipientEmail: email,
    templateData: {
      ...opts.templateData,
      actionUrl: opts.templateData.actionUrl ?? canonicalUrl("/dashboard"),
    },
    idempotencyKey: opts.idempotencyKey,
  });
}
