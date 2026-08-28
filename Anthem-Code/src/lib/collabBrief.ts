import { DEFAULT_COLLAB_MESSAGE } from "@/lib/chatContext";
import {
  appendAttachmentsToMessage,
  formatHireDeadlineLabel,
  parseAttachmentUrlsFromMessage,
  stripAttachmentBlock,
} from "@/lib/hireBrief";
import { isUuid } from "@/lib/uuid";

const COLLAB_TYPE_LABELS: Record<string, string> = {
  chat: "พูดคุย",
  "joint-project": "ร่วมโปรเจกต์",
  "skill-swap": "แลกเปลี่ยนสกิล",
  studio: "Studio/ทีม",
  experiment: "งานทดลอง",
  content: "คอนเทนต์",
  other: "อื่นๆ",
};

/** Soft decline reasons for collab — no forward / money paths. */
export const COLLAB_REJECT_REASONS = [
  {
    id: "busy_now",
    label: "ตอนนี้โฟกัสงานอื่นอยู่ ยังไม่พร้อมร่วมงาน",
  },
  {
    id: "style_mismatch",
    label: "ทิศทางหรือสไตล์ยังไม่ตรงกัน",
  },
  {
    id: "not_ready",
    label: "ยังไม่พร้อมลงมือจริงตอนนี้",
  },
  {
    id: "solo_focus",
    label: "ช่วงนี้โฟกัสทำคนเดียว / ยังไม่รับคอลแลป",
  },
  { id: "other", label: "อื่นๆ" },
] as const;

export type CollabRejectReasonId = (typeof COLLAB_REJECT_REASONS)[number]["id"];

export function collabRejectReasonLabel(id: string | null | undefined): string {
  if (!id) return "";
  if (id === "busy_but_chat") return "ตอนนี้ยังไม่พร้อมร่วมงานจริงจัง แต่ยินดีคุยไอเดียต่อ";
  return COLLAB_REJECT_REASONS.find((r) => r.id === id)?.label ?? id;
}

/** Chat message prefix / tag for declined collab invites. */
export const COLLAB_DECLINE_PREFIX = "🙏 ปฏิเสธคำชวนคอลแลป";

export function isCollabDeclineChatMessage(content: string | null | undefined): boolean {
  if (!content) return false;
  const t = content.trim();
  return (
    t.startsWith(COLLAB_DECLINE_PREFIX) ||
    t.startsWith("ปฏิเสธคำชวนคอลแลป") ||
    t.startsWith("🙏 ปฏิเสธคำชวนคอลแลป") ||
    // Legacy one-liner declines
    t.startsWith("ยังไม่พร้อมร่วมงาน")
  );
}

/** Soft, polite decline copy posted into chat after reject. */
export function buildCollabDeclineChatMessage(opts: {
  reasonLabel?: string | null;
  /** Reserved — soft/hard decline share the same polite chat copy. */
  keepChat?: boolean;
}): string {
  const reason = (opts.reasonLabel ?? "").trim() || "เหตุผลส่วนตัวในช่วงนี้";

  return [
    COLLAB_DECLINE_PREFIX,
    "",
    `เนื่องจาก: ${reason}`,
    "",
    "ขอบคุณที่สนใจผลงานและสนใจชวนคอลแลปนะ",
    "",
    `ต้องขอปฏิเสธเนื่องจาก ${reason}`,
    "",
    "จากนั้นถ้าอยากคุยเล่นหรือแลกไอเดียต่อ ก็คุยกันได้ตามสบายเลย",
  ].join("\n");
}

export type CollabBriefSource = {
  project_title?: string | null;
  project_cover_url?: string | null;
  project_id?: string | null;
  message?: string | null;
  timeline?: string | null;
  collab_types?: string[] | null;
  other_type_note?: string | null;
  reference_links?: string[] | null;
  sender_name?: string | null;
  sender_username?: string | null;
  sender_email?: string | null;
};

export function formatCollabTypesLabel(
  types: string[] | null | undefined,
  otherNote?: string | null,
): string | null {
  const labels = (types ?? [])
    .map((t) => {
      const name = COLLAB_TYPE_LABELS[t] ?? t;
      return t === "other" && otherNote?.trim() ? `${name}: ${otherNote.trim()}` : name;
    })
    .filter(Boolean);
  return labels.length ? labels.join(" · ") : null;
}

export function formatCollabTimelineLabel(timeline: string | null | undefined): string | null {
  return formatHireDeadlineLabel(timeline);
}

function formatCollabContactLine(collab: CollabBriefSource): string | null {
  const parts = [
    collab.sender_username?.trim()
      ? `@${collab.sender_username.trim()}`
      : collab.sender_name?.trim() || null,
    collab.sender_email?.trim() || null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function formatCollabBriefChatText(collab: CollabBriefSource): string {
  const body = stripAttachmentBlock(collab.message)?.trim() || DEFAULT_COLLAB_MESSAGE;
  const types = formatCollabTypesLabel(collab.collab_types, collab.other_type_note);
  const timeline = formatCollabTimelineLabel(collab.timeline);
  const contact = formatCollabContactLine(collab);
  const links = (collab.reference_links ?? []).map((u) => u.trim()).filter(Boolean);

  const lines = [
    "🤝 คำชวนคอลแลป",
    collab.project_title ? `อ้างอิง: ${collab.project_title}` : null,
    collab.project_cover_url ? `ปกอ้างอิง: ${collab.project_cover_url}` : null,
    collab.project_id && isUuid(collab.project_id) ? `ผลงานอ้างอิง: ${collab.project_id}` : null,
    timeline ? `ช่วงเวลา: ${timeline}` : null,
    types ? `อยากร่วมงานแบบไหน: ${types}` : null,
    links.length ? `ลิงก์อ้างอิง:\n${links.map((u) => `- ${u}`).join("\n")}` : null,
    body ? `\nข้อความถึง:\n${body}` : null,
    contact ? `\nติดต่อ: ${contact}` : null,
  ].filter((line) => line !== null && line !== "");

  const text = lines.join("\n");
  const attachments = parseAttachmentUrlsFromMessage(collab.message);
  return attachments.length ? appendAttachmentsToMessage(text, attachments) : text;
}

/** Invite card seed text for opening a collab chat. */
export function buildCollabInviteChatMessage(collab: CollabBriefSource): string {
  return formatCollabBriefChatText(collab);
}

/** Auto-seeded collab invitation bubble in chat (card + accept/decline). */
export function isCollabBriefChatMessage(content: string | null | undefined): boolean {
  if (!content) return false;
  const t = content.trim();
  if (t.startsWith("🤝 คำชวนคอลแลป") || t.startsWith("คำชวนคอลแลป")) return true;
  // Legacy / context open-chat lines (before formal brief prefix)
  if (t.startsWith("สนใจคอลแลป")) return true;
  if (t.startsWith("สนใจร่วมงาน")) return true;
  if (/^ดูโปรไฟล์ .+ แล้วสนใจร่วมงาน/.test(t)) return true;
  return false;
}

/** Parse one-or-many reference links from a multi-line / comma-separated field. */
export function parseCollabReferenceLinks(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[\n,]+/)) {
    const url = part.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function serializeCollabReferenceLinks(urls: string[]): string {
  return urls.map((u) => u.trim()).filter(Boolean).join("\n");
}

/** Collect links from legacy dual columns + multi-line drive field. */
export function collectCollabReferenceLinks(opts: {
  external_drive_url?: string | null;
  website_url?: string | null;
}): string[] {
  return parseCollabReferenceLinks(
    [opts.external_drive_url, opts.website_url].filter(Boolean).join("\n"),
  );
}

function matchLabeledLine(raw: string, label: string): string | null {
  const re = new RegExp(`^${label}:\\s*(.+)$`, "m");
  const value = raw.match(re)?.[1]?.trim();
  return value || null;
}

export type CollabInviteDisplay = {
  projectTitle: string | null;
  projectCoverUrl: string | null;
  projectId: string | null;
  collabTypesLabel: string | null;
  links: string[];
  attachments: string[];
  personalMessage: string | null;
};

/** Strip the auto-seeded chat wrapper around a collab invite body. */
export function stripCollabChatWrapper(message: string | null | undefined): string {
  return stripAttachmentBlock(message)
    .replace(/^🤝?\s*คำชวนคอลแลป\s*$/m, "")
    .replace(/^อ้างอิง:\s*.*$/m, "")
    .replace(/^ปกอ้างอิง:\s*.*$/m, "")
    .replace(/^ผลงานอ้างอิง:\s*.*$/m, "")
    .replace(/^ช่วงเวลา:\s*.*$/m, "")
    .replace(/^ประเภท:\s*.*$/m, "")
    .replace(/^อยากร่วมงานแบบไหน:\s*.*$/m, "")
    .replace(/ลิงก์อ้างอิง:[\s\S]*?(?=\nข้อความถึง:|\nติดต่อ:|$)/, "")
    .replace(/^ข้อความถึง:\s*$/m, "")
    .replace(/^ติดต่อ:\s*.*$/m, "")
    .trim();
}

/** Parse fields seeded around the collab invite body in chat. */
export function parseCollabChatEnvelope(message: string | null | undefined): CollabInviteDisplay {
  const raw = stripAttachmentBlock(message);
  const projectIdRaw = matchLabeledLine(raw, "ผลงานอ้างอิง");
  const links: string[] = [];
  const linkSplit = raw.split(/ลิงก์อ้างอิง:\s*\n/);
  if (linkSplit[1]) {
    for (const line of linkSplit[1].split("\n")) {
      const t = line.trim().replace(/^[-•*]\s*/, "");
      if (!t) continue;
      if (/^https?:\/\//i.test(t)) {
        links.push(t);
        continue;
      }
      break;
    }
  }

  let personalMessage: string | null = null;
  const msgSplit = raw.split(/ข้อความถึง:\s*\n/);
  if (msgSplit[1]) {
    personalMessage = msgSplit[1].split(/\n\s*\nติดต่อ:/)[0]?.trim() || null;
  } else {
    personalMessage = stripCollabChatWrapper(raw) || null;
  }

  return {
    projectTitle: matchLabeledLine(raw, "อ้างอิง"),
    projectCoverUrl: matchLabeledLine(raw, "ปกอ้างอิง"),
    projectId: projectIdRaw && isUuid(projectIdRaw) ? projectIdRaw : null,
    collabTypesLabel:
      matchLabeledLine(raw, "อยากร่วมงานแบบไหน") || matchLabeledLine(raw, "ประเภท"),
    links,
    attachments: parseAttachmentUrlsFromMessage(message),
    personalMessage,
  };
}

export function collabInviteDisplay(opts: {
  message?: string | null;
  collab_types?: string[] | null;
  other_type_note?: string | null;
  external_drive_url?: string | null;
  website_url?: string | null;
  project_title?: string | null;
  project_cover_url?: string | null;
  project_id?: string | null;
  attachment_urls?: string[] | null;
}): CollabInviteDisplay {
  const parsed = parseCollabChatEnvelope(opts.message);
  const fromColumn = formatCollabTypesLabel(opts.collab_types, opts.other_type_note);
  const fromCols = collectCollabReferenceLinks({
    external_drive_url: opts.external_drive_url,
    website_url: opts.website_url,
  });
  const overlayAtt =
    opts.attachment_urls?.filter((u) => typeof u === "string" && u.trim()) ?? [];
  const rawBody = stripAttachmentBlock(opts.message);
  const personalFromRow =
    rawBody && !rawBody.includes("คำชวนคอลแลป") ? rawBody : parsed.personalMessage;

  return {
    projectTitle: opts.project_title?.trim() || parsed.projectTitle,
    projectCoverUrl: opts.project_cover_url?.trim() || parsed.projectCoverUrl,
    projectId: opts.project_id && isUuid(opts.project_id) ? opts.project_id : parsed.projectId,
    collabTypesLabel: fromColumn || parsed.collabTypesLabel,
    links: fromCols.length ? fromCols : parsed.links,
    attachments: overlayAtt.length ? overlayAtt : parsed.attachments,
    personalMessage: personalFromRow,
  };
}
