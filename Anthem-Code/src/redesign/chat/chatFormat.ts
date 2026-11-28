/**
 * Chat of the new design: what a stored message becomes on screen, and the time words (mock Chat / ChatDock).
 * The new design has text, pictures (gone after 30 days) and work cards only. System lines and the old
 * hiring / collab protocol blobs (`__APLUS1_…`) are not shown (owner rule: no hiring in the new design).
 */
export const IMAGE_DAYS = 30;
const DAY = 86_400_000;

export type MsgInput = {
  sender_id: string;
  content: string | null;
  attachment_url?: string | null;
  message_type: string | null;
  project_id?: string | null;
  created_at: string;
  deleted_at?: string | null;
};

export type MsgKind = "text" | "img" | "exp" | "work" | "file";

/** How a message shows, or null when the new design leaves it out. */
export function msgKind(m: MsgInput, now: Date): MsgKind | null {
  if (m.deleted_at) return null;
  const type = m.message_type || "text";
  if (type === "system" || type === "service") return null;
  if ((m.content ?? "").startsWith("__APLUS1_")) return null;
  if (type === "image") return now.getTime() - new Date(m.created_at).getTime() > IMAGE_DAYS * DAY ? "exp" : "img";
  if (type === "project") return m.project_id ? "work" : "text";
  if (type === "file") return "file";
  if (type === "profile") return "text";
  return (m.content ?? "").trim() ? "text" : null;
}

/** Short words for the room list and the small chat (mock ChatStore.label). */
export function msgLabel(m: MsgInput, now: Date): string {
  const kind = msgKind(m, now);
  if (kind === "img") return "ส่งรูป";
  if (kind === "exp") return "รูปหมดอายุแล้ว";
  if (kind === "work") return `แชร์ผลงาน ${m.content?.trim() || ""}`.trim();
  if (kind === "file") return "ไฟล์แนบ";
  if (m.message_type === "profile") return "แชร์โปรไฟล์";
  if (kind === "text") return (m.content ?? "").trim();
  return "";
}

const pad = (n: number) => String(n).padStart(2, "0");
const MS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysAgo = (iso: string, now: Date) => Math.round((startOf(now) - startOf(new Date(iso))) / DAY);

export function clock(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Day line above a group of messages: Today · Yesterday · Mon · 2 Nov (· 2025 for another year). */
export function dayWord(iso: string, now: Date): string {
  const n = daysAgo(iso, now);
  if (n <= 0) return "Today";
  if (n === 1) return "Yesterday";
  const d = new Date(iso);
  if (n < 7) return DW[d.getDay()];
  return `${d.getDate()} ${MS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}

/** Time in the room list: 18:02 today, otherwise the day word. */
export function listTime(iso: string | null | undefined, now: Date): string {
  if (!iso) return "";
  return daysAgo(iso, now) <= 0 ? clock(iso) : dayWord(iso, now);
}

/** True when the day changes between two messages (a day line goes above the second). */
export function newDay(prevIso: string | null | undefined, iso: string): boolean {
  if (!prevIso) return true;
  return startOf(new Date(prevIso)) !== startOf(new Date(iso));
}
