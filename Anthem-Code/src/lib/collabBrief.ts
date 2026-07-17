import { DEFAULT_COLLAB_MESSAGE } from "@/lib/chatContext";

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
  if (id === "busy_but_chat") return "ยังไม่พร้อมร่วมงานตอนนี้ แต่คุยไอเดียได้";
  return COLLAB_REJECT_REASONS.find((r) => r.id === id)?.label ?? id;
}

export type CollabBriefSource = {
  project_title?: string | null;
  message?: string | null;
  timeline?: string | null;
  collab_types?: string[] | null;
};

export function formatCollabBriefChatText(collab: CollabBriefSource): string {
  const body = collab.message?.trim();
  const isDefault = !body || body === DEFAULT_COLLAB_MESSAGE;
  const types = (collab.collab_types ?? [])
    .map((t) => COLLAB_TYPE_LABELS[t] ?? t)
    .filter(Boolean);

  const lines = [
    "🤝 คำชวนคอลแลป",
    collab.project_title ? `อ้างอิง: ${collab.project_title}` : null,
    types.length ? `ประเภท: ${types.join(" · ")}` : null,
    collab.timeline ? `ช่วงเวลา: ${collab.timeline}` : null,
    !isDefault && body ? `\n${body}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

/** Auto-seeded collab invitation bubble in chat. */
export function isCollabBriefChatMessage(content: string | null | undefined): boolean {
  if (!content) return false;
  const t = content.trim();
  return t.startsWith("🤝 คำชวนคอลแลป") || t.startsWith("คำชวนคอลแลป");
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
