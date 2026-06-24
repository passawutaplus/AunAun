import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyFreelancer, getFreelancerDisplayName } from "@/server/emailNotify.server";
import { canonicalUrl } from "@/lib/siteUrl";
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

function fmtThaiDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function daysUntil(deadlineIso: string): number {
  const deadline = new Date(deadlineIso);
  deadline.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((deadline.getTime() - today.getTime()) / 86400000);
}

export async function runDeadlineReminders(): Promise<{ sent: number; skipped: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = addDays(today, 2);
  const from = dateKey(today);
  const to = dateKey(horizon);

  const { data: jobs, error } = await supabaseAdmin
    .from("job_trackers")
    .select("id, user_id, title, deadline, status, share_token")
    .not("deadline", "is", null)
    .gte("deadline", from)
    .lte("deadline", to)
    .neq("status", "completed");

  if (error) throwClientError("deadlineReminders.load", error);

  let sent = 0;
  let skipped = 0;

  for (const job of jobs ?? []) {
    if (!job.deadline || !job.user_id) {
      skipped++;
      continue;
    }

    const remaining = daysUntil(job.deadline);
    if (remaining < 0 || remaining > 2) {
      skipped++;
      continue;
    }

    const recipientName = await getFreelancerDisplayName(job.user_id);
    const dueLabel = fmtThaiDate(job.deadline);
    const message =
      remaining === 0
        ? `งาน "${job.title}" ครบกำหนดส่งวันนี้ (${dueLabel}) — อย่าลืมส่งมอบงานให้ลูกค้านะครับ`
        : remaining === 1
          ? `งาน "${job.title}" ครบกำหนดพรุ่งนี้ (${dueLabel}) — เหลือเวลาอีก 1 วัน`
          : `งาน "${job.title}" ครบกำหนดในอีก 2 วัน (${dueLabel}) — วางแผนให้ทันนะครับ`;

    const result = await notifyFreelancer({
      userId: job.user_id,
      templateName: "project-alert",
      templateData: {
        recipientName,
        projectName: job.title ?? "โปรเจกต์",
        alertType: "deadline",
        message,
        dueDate: dueLabel,
        actionUrl: job.share_token
          ? canonicalUrl(`/dashboard?tab=projects`)
          : canonicalUrl("/dashboard"),
      },
      idempotencyKey: `deadline-${job.id}-${dateKey(today)}-${remaining}`,
    });

    if (result.ok) sent++;
    else skipped++;
  }

  return { sent, skipped };
}
