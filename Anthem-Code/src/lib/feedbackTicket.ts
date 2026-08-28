export const FEEDBACK_KINDS = ["bug", "idea", "error"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "บั๊ก",
  idea: "ไอเดีย",
  error: "พังทั้งหน้า",
};

export const FEEDBACK_KIND_OPTIONS: { value: FeedbackKind; label: string; chip: string; hint: string }[] = [
  { value: "bug", label: "บั๊ก", chip: "Bug", hint: "ปุ่มพัง หรือแสดงผิด" },
  { value: "idea", label: "ไอเดีย", chip: "Idea", hint: "อยากได้ฟีเจอร์ใหม่" },
  { value: "error", label: "พังทั้งหน้า", chip: "Error", hint: "หน้าขาว ส่งไม่ได้ โหลดไม่ขึ้น" },
];

export const FEEDBACK_SCREENSHOT_BUCKET = "feedback-screenshots";

export function isFeedbackKind(value: string | null | undefined): value is FeedbackKind {
  return value === "bug" || value === "idea" || value === "error";
}

export function encodeFeedbackScreenshotRef(path: string): string {
  return `${FEEDBACK_SCREENSHOT_BUCKET}:${path}`;
}

export function parseFeedbackScreenshotRef(ref: string): { bucket: string; path: string } | null {
  if (!ref) return null;
  const i = ref.indexOf(":");
  if (i <= 0) return null;
  const bucket = ref.slice(0, i);
  const path = ref.slice(i + 1);
  if (!bucket || !path || path.includes("..")) return null;
  return { bucket, path };
}

export type FeedbackCommentPin = {
  number: number;
  nx: number;
  ny: number;
  text: string;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function parseFeedbackComments(raw: unknown): FeedbackCommentPin[] {
  if (!raw || typeof raw !== "object") return [];
  const comments = (raw as { comments?: unknown }).comments;
  if (!Array.isArray(comments)) return [];
  const out: FeedbackCommentPin[] = [];
  for (const item of comments) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (rec.nx == null || rec.ny == null) continue;
    const nxRaw = Number(rec.nx);
    const nyRaw = Number(rec.ny);
    if (!Number.isFinite(nxRaw) || !Number.isFinite(nyRaw)) continue;
    const nx = clamp01(nxRaw);
    const ny = clamp01(nyRaw);
    const number = Math.max(1, Math.min(99, Math.round(Number(rec.number) || out.length + 1)));
    const text = typeof rec.text === "string" ? rec.text.trim().slice(0, 500) : "";
    out.push({ number, nx, ny, text });
    if (out.length >= 20) break;
  }
  return out;
}

export function serializeFeedbackAnnotations(comments: FeedbackCommentPin[]): { comments: FeedbackCommentPin[] } {
  return { comments: parseFeedbackComments({ comments }) };
}

export function feedbackKindLabel(kind: string | null | undefined): string {
  if (isFeedbackKind(kind)) return FEEDBACK_KIND_LABELS[kind];
  return "คะแนน";
}
