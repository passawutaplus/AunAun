import { HIRE_ENGAGEMENT_TYPES, JOB_TYPES } from "@/components/hiring/HireWizardFields";

export type HireBriefSource = {
  project_title?: string | null;
  client_name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  deadline?: string | null;
  budget_amount?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
  attachment_urls?: string[] | null;
};

const ATTACHMENT_MARKER = "\n\n---\nแนบภาพ:";

/** Parse attachment URLs stored in message fallback (before DB column exists). */
export function parseAttachmentUrlsFromMessage(message: string | null | undefined): string[] {
  if (!message?.includes(ATTACHMENT_MARKER)) return [];
  const tail = message.split(ATTACHMENT_MARKER)[1] ?? "";
  return tail
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("http"));
}

export function stripAttachmentBlock(message: string | null | undefined): string {
  if (!message?.includes(ATTACHMENT_MARKER)) return message?.trim() ?? "";
  return message.split(ATTACHMENT_MARKER)[0]?.trim() ?? "";
}

export function appendAttachmentsToMessage(message: string, urls: string[]): string {
  if (!urls.length) return message;
  return `${message}${ATTACHMENT_MARKER}\n${urls.join("\n")}`;
}

export function formatHireBudgetLabel(opts: {
  budget_min?: number | null;
  budget_max?: number | null;
  budget_amount?: number | null;
  budget?: string | null;
}): string | null {
  const min = opts.budget_min ?? null;
  const max = opts.budget_max ?? null;
  const amount = opts.budget_amount ?? null;
  if (min != null && max != null) {
    return `฿${min.toLocaleString("th-TH")}–${max.toLocaleString("th-TH")}`;
  }
  if (min != null) return `฿${min.toLocaleString("th-TH")}+`;
  if (max != null) return `ถึง ฿${max.toLocaleString("th-TH")}`;
  if (amount != null) return `฿${amount.toLocaleString("th-TH")}`;
  if (opts.budget && String(opts.budget).trim()) return String(opts.budget);
  return null;
}

export function formatHireDeadlineLabel(deadline: string | null | undefined): string | null {
  if (!deadline?.trim()) return null;
  const raw = deadline.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(`${raw.slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
    }
  }
  return raw;
}

export function formatHireBriefChatText(hire: HireBriefSource): string {
  const body = stripAttachmentBlock(hire.message);
  const budget = formatHireBudgetLabel(hire);
  const deadline = formatHireDeadlineLabel(hire.deadline);
  const lines = [
    "📋 คำชวนงาน",
    hire.project_title ? `อ้างอิง: ${hire.project_title}` : null,
    budget ? `งบประมาณ: ${budget}` : null,
    deadline ? `กำหนดส่ง: ${deadline}` : null,
    body ? `\n${body}` : null,
    hire.client_name || hire.email || hire.phone
      ? `\nติดต่อ: ${[hire.client_name, hire.email, hire.phone].filter(Boolean).join(" · ")}`
      : null,
  ].filter(Boolean);

  return lines.join("\n");
}

/** Auto-seeded hire invitation bubble in chat. */
export function isHireBriefChatMessage(content: string | null | undefined): boolean {
  if (!content) return false;
  const t = content.trim();
  return t.startsWith("📋 คำชวนงาน") || t.startsWith("คำชวนงาน");
}

export function jobTypeLabel(jobTypeId: string): string {
  const engagement = HIRE_ENGAGEMENT_TYPES.find((j) => j.id === jobTypeId);
  if (engagement) return engagement.label;
  return JOB_TYPES.find((j) => j.id === jobTypeId)?.label ?? jobTypeId;
}

/** Labels for one or many job_type ids (comma-separated in DB). */
export function formatHireJobTypesLabel(jobType: string | null | undefined): string | null {
  if (!jobType?.trim()) return null;
  const ids = jobType.split(",").map((s) => s.trim()).filter(Boolean);
  if (!ids.length) return null;
  return ids.map(jobTypeLabel).join(" · ");
}

export const HIRE_REJECT_REASONS = [
  {
    id: "queue_full",
    label: "ขออภัย ขณะนี้คิวงานเต็ม ยังไม่สะดวกรับงานเพิ่มได้ในตอนนี้",
  },
  {
    id: "not_this_type",
    label: "ขออภัย ยังไม่เปิดรับประเภทงานที่ทางผู้ว่าจ้างเสนอมา",
  },
  {
    id: "budget_mismatch",
    label: "งบประมาณที่แจ้งมา ไม่สะดวกที่จะรับงาน",
  },
  {
    id: "deadline_mismatch",
    label: "ระยะเวลากำหนดส่งที่แจ้งมา ไม่สามารถทำได้ทัน",
  },
  { id: "other", label: "อื่นๆ" },
] as const;

export type HireRejectReasonId = (typeof HIRE_REJECT_REASONS)[number]["id"];

export function hireRejectReasonLabel(id: string | null | undefined): string {
  if (!id) return "";
  if (id === "busy_but_chat") return "ยังไม่พร้อมทำตอนนี้ แต่คุยรายละเอียดได้";
  if (id === "forwarded") return "ส่งต่องานให้เพื่อน";
  // legacy id before budget/deadline were split
  if (id === "budget_timeline") return "งบประมาณหรือกำหนดส่งที่แจ้งมา ยังไม่สะดวกรับงาน";
  return HIRE_REJECT_REASONS.find((r) => r.id === id)?.label ?? id;
}

/** Message posted to the hiring client when a job is forwarded to a friend. */
export function hireForwardClientNotice(friendName: string): string {
  const name = friendName.trim() || "เพื่อนครีเอเตอร์";
  return `ขอบคุณที่สนใจ แต่ทางเราไม่สะดวกที่จะรับงานนี้ เลยขอเสนอ ${name} คนนี้แทน ขอบคุณ`;
}
