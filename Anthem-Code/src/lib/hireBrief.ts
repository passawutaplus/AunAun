import { JOB_TYPES } from "@/components/hiring/HireWizardFields";

export type HireBriefSource = {
  project_title?: string | null;
  client_name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  deadline?: string | null;
  budget_amount?: number | null;
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

export function formatHireBriefChatText(hire: HireBriefSource): string {
  const body = stripAttachmentBlock(hire.message);
  const lines = [
    "📋 คำชวนงาน",
    hire.project_title ? `อ้างอิง: ${hire.project_title}` : null,
    hire.budget_amount != null ? `งบประมาณ: ฿${hire.budget_amount.toLocaleString("th-TH")}` : null,
    hire.deadline ? `กำหนดส่ง: ${hire.deadline}` : null,
    body ? `\n${body}` : null,
    hire.client_name || hire.email || hire.phone
      ? `\nติดต่อ: ${[hire.client_name, hire.email, hire.phone].filter(Boolean).join(" · ")}`
      : null,
  ].filter(Boolean);

  return lines.join("\n");
}

export function jobTypeLabel(jobTypeId: string): string {
  return JOB_TYPES.find((j) => j.id === jobTypeId)?.label ?? jobTypeId;
}
