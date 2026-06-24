import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTemplateEmail } from "@/server/portalEmail.server";
import { notifyFreelancer, getFreelancerDisplayName } from "@/server/emailNotify.server";
import { canonicalUrl } from "@/lib/siteUrl";
import { throwClientError } from "@/lib/security";

const ShareTokenSchema = z.object({ shareToken: z.string().uuid() });

export const sendPortalLinkToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ShareTokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: job, error: jobErr } = await supabaseAdmin
      .from("job_trackers")
      .select(
        "id, share_token, client_name, title, quotation_id, user_id, deposit_percent, total_amount",
      )
      .eq("share_token", data.shareToken)
      .eq("user_id", userId)
      .maybeSingle();

    if (jobErr) throwClientError("portalEmail.sendPortalLink.lookup", jobErr, "ไม่พบงานนี้");
    if (!job) throw new Error("ไม่พบงานนี้");

    let clientEmail: string | null = null;
    let projectName = job.title ?? "โปรเจกต์";
    let depositAmount: string | undefined;

    if (job.quotation_id) {
      const { data: q } = await supabaseAdmin
        .from("quotations")
        .select("client_email, project_name, deposit_preset")
        .eq("id", job.quotation_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (q) {
        clientEmail = q.client_email;
        projectName = q.project_name ?? projectName;
        const depositPct = q.deposit_preset ?? job.deposit_percent ?? 50;
        const total = job.total_amount ?? 0;
        depositAmount = `฿${Math.round(total * (depositPct / 100)).toLocaleString("th-TH")} (มัดจำ ${depositPct}%)`;
      }
    }

    if (!clientEmail?.trim()) {
      throw new Error("ยังไม่มีอีเมลลูกค้า — ใส่ในใบเสนอราคาก่อน");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("brand_name, display_name")
      .eq("user_id", userId)
      .maybeSingle();

    const portalUrl = canonicalUrl(`/track/${job.share_token}`);
    const freelancerName = profile?.brand_name || profile?.display_name || "ฟรีแลนซ์";

    const result = await enqueueTemplateEmail({
      templateName: "quotation-portal",
      recipientEmail: clientEmail.trim(),
      templateData: {
        clientName: job.client_name ?? "ลูกค้า",
        freelancerName,
        projectName,
        portalUrl,
        depositAmount,
        message:
          "แนบใบเสนอราคาและรายละเอียดงานไว้ในลิงก์แล้ว รบกวนตรวจสอบและกดยอมรับได้เลยครับ/ค่ะ",
      },
      idempotencyKey: `portal-${job.id}-${Date.now().toString(36)}`,
    });

    if (!result.ok) {
      if (result.reason === "suppressed") throw new Error("อีเมลนี้ยกเลิกรับข่าวแล้ว");
      throw new Error("ส่งอีเมลไม่สำเร็จ — ลองใหม่อีกครั้ง");
    }

    return { ok: true as const, sentTo: clientEmail.trim() };
  });

const AcceptSchema = z.object({
  token: z.string().uuid(),
  clientName: z.string().min(1).max(120),
});

export const acceptQuotationByToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AcceptSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("job_trackers")
      .select("id, user_id, client_name, title, quotation_id")
      .eq("share_token", data.token)
      .maybeSingle();

    if (jobErr)
      throwClientError("portalEmail.acceptQuotation.lookup", jobErr, "ไม่พบใบเสนอราคาสำหรับงานนี้");
    if (!job?.quotation_id) throw new Error("ไม่พบใบเสนอราคาสำหรับงานนี้");

    const { data: q, error: qErr } = await supabaseAdmin
      .from("quotations")
      .select("id, status, number, project_name")
      .eq("id", job.quotation_id)
      .maybeSingle();

    if (qErr) throwClientError("portalEmail.acceptQuotation.load", qErr, "ไม่พบใบเสนอราคา");
    if (!q) throw new Error("ไม่พบใบเสนอราคา");

    const allowed = ["draft", "pending_approval", "sent"];
    if (!allowed.includes(q.status)) {
      throw new Error("ใบเสนอราคานี้ไม่สามารถยอมรับได้ในสถานะปัจจุบัน");
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from("quotations")
      .update({ status: "pending_payment" })
      .eq("id", q.id)
      .in("status", allowed)
      .select("id")
      .maybeSingle();

    if (updErr)
      throwClientError(
        "portalEmail.acceptQuotation.update",
        updErr,
        "ใบเสนอราคานี้ไม่สามารถยอมรับได้ในสถานะปัจจุบัน",
      );
    if (!updated) throw new Error("ใบเสนอราคานี้ไม่สามารถยอมรับได้ในสถานะปัจจุบัน");

    const clientLabel = data.clientName.trim() || job.client_name || "ลูกค้า";
    await supabaseAdmin.from("notifications").insert({
      user_id: job.user_id,
      type: "hire",
      message: `${clientLabel} ยอมรับใบเสนอราคา ${q.number} แล้ว — พร้อมออกใบแจ้งหนี้`,
      url: "/dashboard?tab=finance&sub=quotations",
      read: false,
      actor_name: clientLabel,
      actor_avatar: null,
    });

    const recipientName = await getFreelancerDisplayName(job.user_id);
    void notifyFreelancer({
      userId: job.user_id,
      templateName: "quotation-accepted",
      templateData: {
        recipientName,
        clientName: clientLabel,
        projectName: q.project_name ?? job.title ?? "โปรเจกต์",
        quotationNumber: q.number,
        actionUrl: canonicalUrl("/dashboard?tab=finance&sub=quotations"),
      },
      idempotencyKey: `quotation-accepted-${q.id}`,
    });

    return {
      ok: true as const,
      status: "pending_payment" as const,
      projectName: q.project_name ?? job.title,
    };
  });
