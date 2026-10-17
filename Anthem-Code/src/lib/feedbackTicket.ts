export const FEEDBACK_KINDS = ["idea", "bug", "ux", "praise", "error", "rating"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  idea: "ไอเดีย",
  bug: "เจอบั๊ก",
  ux: "ใช้ยาก",
  praise: "ชอบ",
  error: "พังทั้งหน้า",
  rating: "ให้คะแนน",
};

/** Chips shown in the composer (error/rating are legacy or prompt-only). */
export const FEEDBACK_KIND_OPTIONS: { value: FeedbackKind; label: string; chip: string; hint: string }[] = [
  { value: "idea", label: "ไอเดีย", chip: "ไอเดีย", hint: "อยากได้ฟีเจอร์ใหม่ หรืออยากให้ปรับ" },
  { value: "bug", label: "เจอบั๊ก", chip: "เจอบั๊ก", hint: "ปุ่มพัง แสดงผิด โหลดไม่ขึ้น" },
  { value: "ux", label: "ใช้ยาก", chip: "ใช้ยาก", hint: "หาไม่เจอ งง ไม่รู้ต้องกดตรงไหน" },
  { value: "praise", label: "ชอบ", chip: "ชอบ", hint: "ส่วนไหนที่ชอบ อยากให้เก็บไว้" },
];

export const FEEDBACK_SCREENSHOT_BUCKET = "feedback-screenshots";

export function isFeedbackKind(value: string | null | undefined): value is FeedbackKind {
  return !!value && (FEEDBACK_KINDS as readonly string[]).includes(value);
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
