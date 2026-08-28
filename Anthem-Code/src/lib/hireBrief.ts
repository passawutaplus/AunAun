import { HIRE_ENGAGEMENT_TYPES, JOB_TYPES } from "@/components/hiring/HireWizardFields";

export type HireBriefSource = {
  project_title?: string | null;
  project_cover_url?: string | null;
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
    hire.project_cover_url ? `ปกอ้างอิง: ${hire.project_cover_url}` : null,
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

export type ParsedHireInviteBrief = {
  jobTypesLabel: string | null;
  details: string | null;
  links: string[];
};

export type HireChatEnvelope = {
  projectTitle: string | null;
  projectCoverUrl: string | null;
  budgetLabel: string | null;
  deadlineLabel: string | null;
  contact: string | null;
};

function matchLabeledLine(raw: string, label: string): string | null {
  const re = new RegExp(`^${label}:\\s*(.+)$`, "m");
  const value = raw.match(re)?.[1]?.trim();
  return value || null;
}

/** Header/footer fields seeded around the invite body in chat. */
export function parseHireChatEnvelope(message: string | null | undefined): HireChatEnvelope {
  const raw = stripAttachmentBlock(message);
  return {
    projectTitle: matchLabeledLine(raw, "อ้างอิง"),
    projectCoverUrl: matchLabeledLine(raw, "ปกอ้างอิง"),
    budgetLabel: matchLabeledLine(raw, "งบประมาณ"),
    deadlineLabel: matchLabeledLine(raw, "กำหนดส่ง"),
    contact: matchLabeledLine(raw, "ติดต่อ"),
  };
}

/** Strip the auto-seeded chat wrapper around a hire invite body. */
export function stripHireChatWrapper(message: string | null | undefined): string {
  return stripAttachmentBlock(message)
    .replace(/^📋?\s*คำชวนงาน\s*$/m, "")
    .replace(/^อ้างอิง:\s*.*$/m, "")
    .replace(/^ปกอ้างอิง:\s*.*$/m, "")
    .replace(/^งบประมาณ:\s*.*$/m, "")
    .replace(/^กำหนดส่ง:\s*.*$/m, "")
    .replace(/^ติดต่อ:\s*.*$/m, "")
    .trim();
}

/** Parse the invite text built by `buildHireInviteMessage`. */
export function parseHireInviteMessage(message: string | null | undefined): ParsedHireInviteBrief {
  const raw = stripHireChatWrapper(message);
  if (!raw.trim()) return { jobTypesLabel: null, details: null, links: [] };

  const jobMatch = raw.match(/^ประเภทงาน:\s*(.+)$/m);
  const jobTypesLabel = jobMatch?.[1]?.trim() || null;

  const links: string[] = [];
  const linkSplit = raw.split(/ลิงก์อ้างอิง:\s*\n/);
  if (linkSplit[1]) {
    for (const line of linkSplit[1].split("\n")) {
      const t = line.trim().replace(/^[-•*]\s*/, "");
      if (!t) continue;
      if (/^https?:\/\//i.test(t)) links.push(t);
    }
  }

  let details: string | null = null;
  const detailsSplit = raw.split(/รายละเอียด:\s*\n/);
  if (detailsSplit[1]) {
    details = detailsSplit[1].split(/\n\s*\nลิงก์อ้างอิง:/)[0]?.trim() || null;
  } else {
    details =
      raw
        .replace(/^ประเภทงาน:.*$/m, "")
        .replace(/ลิงก์อ้างอิง:[\s\S]*$/, "")
        .trim() || null;
  }

  return { jobTypesLabel, details, links };
}

export function hireInviteDisplay(req: {
  message?: string | null;
  job_type?: string | null;
  attachment_urls?: string[] | null;
}): ParsedHireInviteBrief & HireChatEnvelope & { attachments: string[] } {
  const parsed = parseHireInviteMessage(req.message);
  const envelope = parseHireChatEnvelope(req.message);
  const fromColumn = formatHireJobTypesLabel(req.job_type);
  const attachments =
    req.attachment_urls?.filter((u) => typeof u === "string" && u.trim()) ??
    parseAttachmentUrlsFromMessage(req.message);
  return {
    jobTypesLabel: fromColumn && fromColumn !== "Service" ? fromColumn : parsed.jobTypesLabel || fromColumn,
    details: parsed.details,
    links: parsed.links,
    attachments,
    ...envelope,
  };
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
