import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTemplateEmail } from "@/server/portalEmail.server";
import { canonicalUrl } from "@/lib/siteUrl";
import {
  buildFollowUpMessage,
  daysOverdue,
  outstandingAmount,
  type FollowUpTone,
} from "@/lib/email/followUpMessage";
import type { Quotation } from "@/store/quotations";
import { throwClientError } from "@/lib/security";
import type { IssuerSnapshot } from "@/lib/quotationKinds";
import { resolveQuotationSenderName } from "@/lib/quotationSenderName";

const InputSchema = z.object({
  quotationId: z.string().uuid(),
  tone: z.enum(["soft", "formal", "urgent"]).optional(),
});

function mapRowToQuotation(row: Record<string, unknown>): Quotation {
  return {
    id: row.id as string,
    number: (row.number as string) ?? "",
    clientName: (row.client_name as string) ?? "",
    clientEmail: (row.client_email as string) ?? "",
    clientPhone: (row.client_phone as string) ?? "",
    projectName: (row.project_name as string) ?? "",
    status: (row.status as Quotation["status"]) ?? "draft",
    dueDate: (row.due_date as string) ?? undefined,
    invoiceNumber: (row.invoice_number as string) ?? undefined,
    paidPartial: (row.paid_partial as number) ?? 0,
    lateFeePercent: (row.late_fee_percent as number) ?? 0,
    items: Array.isArray(row.items) ? row.items : [],
    addons: Array.isArray(row.addons) ? row.addons : [],
    difficulties: Array.isArray(row.difficulties) ? row.difficulties : [],
    hiddenCost: (row.hidden_cost as number) ?? 0,
    discountValue: (row.discount_value as number) ?? 0,
    discountKind: (row.discount_kind as Quotation["discountKind"]) ?? "amount",
    vatEnabled: !!row.vat_enabled,
    vatRate: (row.vat_rate as number) ?? 0,
    whtEnabled: !!row.wht_enabled,
    whtRate: (row.wht_rate as number) ?? 0,
    depositPreset: (row.deposit_preset as number) ?? 50,
  } as Quotation;
}

export const sendPaymentFollowUpEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: row, error } = await supabaseAdmin
      .from("quotations")
      .select(
        "id, number, client_name, client_email, client_phone, project_name, status, due_date, invoice_number, paid_partial, late_fee_percent, items, addons, difficulties, hidden_cost, discount_value, discount_kind, vat_enabled, vat_rate, wht_enabled, wht_rate, deposit_preset, user_id, quotation_kind, org_snapshot, studio_snapshot",
      )
      .eq("id", data.quotationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throwClientError("followUpEmail.loadQuotation", error, "ไม่พบใบเสนอราคา");
    if (!row) throw new Error("ไม่พบใบเสนอราคา");

    const clientEmail = (row.client_email as string | null)?.trim();
    if (!clientEmail) throw new Error("ยังไม่มีอีเมลลูกค้า — ใส่ในใบเสนอราคาก่อน");

    const q = mapRowToQuotation(row as Record<string, unknown>);
    const amount = outstandingAmount(q);
    const tone: FollowUpTone =
      data.tone ?? (daysOverdue(q) >= 14 ? "urgent" : daysOverdue(q) >= 7 ? "formal" : "soft");
    const message = buildFollowUpMessage(q, amount, tone);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("brand_name, display_name, subscription_tier")
      .eq("user_id", userId)
      .maybeSingle();

    const rowExt = row as Record<string, unknown>;
    const freelancerName = resolveQuotationSenderName({
      quotationKind: rowExt.quotation_kind as Quotation["quotationKind"],
      orgSnapshot: rowExt.org_snapshot as IssuerSnapshot | null,
      studioSnapshot: rowExt.studio_snapshot as IssuerSnapshot | null,
      profileBrandName: profile?.brand_name,
      profileDisplayName: profile?.display_name,
      fallback: "ฟรีแลนซ์",
    });

    const { data: job } = await supabaseAdmin
      .from("job_trackers")
      .select("share_token")
      .eq("quotation_id", q.id)
      .eq("user_id", userId)
      .maybeSingle();

    const portalUrl = job?.share_token
      ? canonicalUrl(`/track/${job.share_token}`)
      : canonicalUrl("/dashboard");

    const result = await enqueueTemplateEmail({
      templateName: "payment-followup",
      recipientEmail: clientEmail,
      templateData: {
        clientName: q.clientName || "ลูกค้า",
        freelancerName,
        projectName: q.projectName || q.number,
        invoiceNumber: q.invoiceNumber ?? q.number,
        amount: `฿${amount.toLocaleString("th-TH")}`,
        dueDate: q.dueDate ?? "—",
        overdueDays: daysOverdue(q),
        tone,
        message,
        portalUrl,
      },
      idempotencyKey: `followup-${q.id}-${tone}-${new Date().toISOString().slice(0, 10)}`,
    });

    if (!result.ok) {
      if (result.reason === "suppressed") throw new Error("อีเมลนี้ยกเลิกรับข่าวแล้ว");
      throw new Error("ส่งอีเมลไม่สำเร็จ — ลองใหม่อีกครั้ง");
    }

    await supabaseAdmin
      .from("quotations")
      .update({ last_followup_at: new Date().toISOString() })
      .eq("id", q.id)
      .eq("user_id", userId);

    return { ok: true as const, sentTo: clientEmail };
  });
