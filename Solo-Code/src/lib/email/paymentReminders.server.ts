import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTemplateEmail } from "@/server/portalEmail.server";
import { canonicalUrl } from "@/lib/siteUrl";
import {
  buildFollowUpMessage,
  daysOverdue,
  outstandingAmount,
  suggestTone,
  type FollowUpTone,
} from "@/lib/email/followUpMessage";
import type { Quotation } from "@/store/quotations";
import { throwClientError } from "@/lib/security";

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function daysUntilDue(dueIso: string): number {
  const due = new Date(dueIso);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

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

function alreadySentToday(lastFollowupAt: string | null | undefined): boolean {
  if (!lastFollowupAt) return false;
  return lastFollowupAt.slice(0, 10) === dateKey(new Date());
}

function shouldSendReminder(
  q: Quotation,
  lastFollowupAt: string | null | undefined,
): { send: boolean; reason: "due_soon" | "overdue"; tone: FollowUpTone } | null {
  if (!q.dueDate || !q.clientEmail?.trim()) return null;
  if (q.status !== "pending_payment" && q.status !== "pending_receipt") return null;
  if (alreadySentToday(lastFollowupAt)) return null;

  const until = daysUntilDue(q.dueDate);
  const overdue = daysOverdue(q);

  if (until === 3 || until === 1) {
    return { send: true, reason: "due_soon", tone: "soft" };
  }
  if (overdue === 1 || overdue === 7 || overdue === 14) {
    return { send: true, reason: "overdue", tone: suggestTone(q) };
  }
  return null;
}

export async function runPaymentReminders(): Promise<{ sent: number; skipped: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = addDays(today, 3);
  const pastHorizon = addDays(today, -14);

  const { data: rows, error } = await supabaseAdmin
    .from("quotations")
    .select(
      "id, number, client_name, client_email, client_phone, project_name, status, due_date, invoice_number, paid_partial, late_fee_percent, items, addons, difficulties, hidden_cost, discount_value, discount_kind, vat_enabled, vat_rate, wht_enabled, wht_rate, deposit_preset, user_id, last_followup_at",
    )
    .in("status", ["pending_payment", "pending_receipt"])
    .not("due_date", "is", null)
    .not("client_email", "is", null)
    .gte("due_date", dateKey(pastHorizon))
    .lte("due_date", dateKey(horizon));

  if (error) throwClientError("paymentReminders.load", error);

  let sent = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    const q = mapRowToQuotation(row as Record<string, unknown>);
    const plan = shouldSendReminder(q, row.last_followup_at as string | null);
    if (!plan) {
      skipped++;
      continue;
    }

    const userId = row.user_id as string;
    const amount = outstandingAmount(q);
    const message = buildFollowUpMessage(q, amount, plan.tone);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("brand_name, display_name")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: job } = await supabaseAdmin
      .from("job_trackers")
      .select("share_token")
      .eq("quotation_id", q.id)
      .eq("user_id", userId)
      .maybeSingle();

    const portalUrl = job?.share_token
      ? canonicalUrl(`/track/${job.share_token}`)
      : canonicalUrl("/dashboard");

    const recipientEmail = q.clientEmail?.trim();
    if (!recipientEmail) continue;

    const result = await enqueueTemplateEmail({
      templateName: "payment-followup",
      recipientEmail,
      templateData: {
        clientName: q.clientName || "ลูกค้า",
        freelancerName: profile?.brand_name || profile?.display_name || "ฟรีแลนซ์",
        projectName: q.projectName || q.number,
        invoiceNumber: q.invoiceNumber ?? q.number,
        amount: `฿${amount.toLocaleString("th-TH")}`,
        dueDate: q.dueDate ?? "—",
        overdueDays: daysOverdue(q),
        tone: plan.tone,
        message,
        portalUrl,
      },
      idempotencyKey: `cron-followup-${q.id}-${plan.reason}-${dateKey(today)}`,
    });

    if (!result.ok) {
      skipped++;
      continue;
    }

    await supabaseAdmin
      .from("quotations")
      .update({ last_followup_at: new Date().toISOString() })
      .eq("id", q.id)
      .eq("user_id", userId);

    sent++;
  }

  return { sent, skipped };
}
