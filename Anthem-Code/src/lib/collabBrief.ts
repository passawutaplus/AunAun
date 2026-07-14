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
