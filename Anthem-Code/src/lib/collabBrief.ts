import { DEFAULT_COLLAB_MESSAGE } from "@/lib/chatContext";
import { formatHireDeadlineLabel } from "@/lib/hireBrief";

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
  message?: string | null;
  timeline?: string | null;
  collab_types?: string[] | null;
  sender_name?: string | null;
  sender_username?: string | null;
  sender_email?: string | null;
};

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
  const body = collab.message?.trim() || DEFAULT_COLLAB_MESSAGE;
  const types = (collab.collab_types ?? [])
    .map((t) => COLLAB_TYPE_LABELS[t] ?? t)
    .filter(Boolean);
  const timeline = formatCollabTimelineLabel(collab.timeline);
  const contact = formatCollabContactLine(collab);

  const lines = [
    "🤝 คำชวนคอลแลป",
    collab.project_title ? `อ้างอิง: ${collab.project_title}` : null,
    timeline ? `ช่วงเวลา: ${timeline}` : null,
    types.length ? `ประเภท: ${types.join(" · ")}` : null,
    body ? `\n${body}` : null,
    contact ? `\nติดต่อ: ${contact}` : null,
  ].filter((line) => line !== null && line !== "");

  return lines.join("\n");
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
