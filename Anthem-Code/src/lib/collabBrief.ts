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
