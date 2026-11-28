/**
 * Chat of the new design: what a stored message becomes on screen, and the time words (mock Chat / ChatDock).
 * The new design has text, pictures (gone after 30 days) and cards (work, profile, event, document, product).
 * System lines and the old hiring / collab protocol blobs (`__APLUS1_…`) are not shown (owner rule: no hiring
 * in the new design). Card blobs (`__SAMECOR_DOC__:`, `[[object]]`) never show as raw JSON.
 */
import { parseEventLink, stripEventLinkLine } from "@/lib/chat/eventLink";
import { parseStudioDocCard, STUDIO_DOC_KIND_LABEL, STUDIO_DOC_PREFIX, type StudioDocChatCard } from "@/lib/documents/studioDocuments";
import { OBJECT_CHAT_PREFIX, parseObjectChatCard } from "@/lib/objects/chatCard";

export const IMAGE_DAYS = 30;
const DAY = 86_400_000;
/** Old system lines written as text before the message_type migration (lib/chatContext SYSTEM_MESSAGE_PREFIX). */
const CONTEXT_PREFIX = "[context]";

export type MsgInput = {
  sender_id: string;
  content: string | null;
  attachment_url?: string | null;
  message_type: string | null;
  project_id?: string | null;
  profile_user_id?: string | null;
  created_at: string;
  deleted_at?: string | null;
};

/** `gone` = unsent (old chat: "ข้อความถูกยกเลิก"). */
export type MsgKind = "text" | "img" | "exp" | "work" | "file" | "profile" | "doc" | "object" | "gone";

/** How a message shows, or null when the new design leaves it out. An unsent message keeps its place as `gone`. */
export function msgKind(m: MsgInput, now: Date): MsgKind | null {
  const kind = baseKind(m, now);
  return kind && m.deleted_at ? "gone" : kind;
}

function baseKind(m: MsgInput, now: Date): MsgKind | null {
  const type = m.message_type || "text";
  const content = (m.content ?? "").trim();
  if (type === "system" || type === "service") return null;
  if (content.startsWith("__APLUS1_") || content.startsWith(CONTEXT_PREFIX)) return null;
  if (type === "image") return now.getTime() - new Date(m.created_at).getTime() > IMAGE_DAYS * DAY ? "exp" : "img";
  if (type === "project") return m.project_id ? "work" : content ? "text" : null;
  if (type === "file") return "file";
  if (type === "profile") return "profile";
  if (content.startsWith(STUDIO_DOC_PREFIX)) return "doc";
  if (content.startsWith(OBJECT_CHAT_PREFIX)) return "object";
  return content ? "text" : null;
}

export type DocCard = {
  /** Kind in words (ใบแจ้งหนี้ · งวด 1/2). */
  kind: string;
  number: string;
  title: string;
  net: number;
  /** The parsed pointer (opens the document); null when the blob does not parse. */
  card: StudioDocChatCard | null;
};

/** Studio document card (quotation / invoice / receipt). A blob that does not parse still gets a plain card. */
export function docOf(content: string | null | undefined): DocCard {
  const c = parseStudioDocCard(content?.trim());
  if (!c) return { kind: "เอกสาร", number: "", title: "", net: 0, card: null };
  const part = c.installmentNo && (c.installmentTotal ?? 1) > 1 ? ` · งวด ${c.installmentNo}/${c.installmentTotal}` : "";
  return { kind: `${STUDIO_DOC_KIND_LABEL[c.kind]}${part}`, number: c.number, title: c.title, net: c.net, card: c };
}

export type ObjectCard = { id: string | null; title: string; price: number; cover: string | null; note: string };

/** Product card ("[[object]]{…}"). A blob that does not parse still gets a plain card, never the JSON. */
export function objectOf(content: string | null | undefined): ObjectCard {
  const c = parseObjectChatCard(content);
  if (!c) return { id: null, title: "สินค้า", price: 0, cover: null, note: "" };
  const note = [c.option, c.qty ? `${c.qty} ชิ้น` : ""].filter(Boolean).join(" · ");
  return { id: c.id, title: c.title, price: c.price_thb, cover: c.cover_url, note };
}

/** Event id when a text links to an event page (`/exhibition/<id>`), so the bubble gets an event card. */
export const eventOf = (m: MsgInput): string | null => ((m.message_type || "text") === "text" ? parseEventLink(m.content) : null);

/** Text of a bubble: without the event link line when the card below shows that event. */
export function textOf(m: MsgInput): string {
  const text = (m.content ?? "").trim();
  return eventOf(m) ? stripEventLinkLine(text).trim() : text;
}

export const UNSENT = "ข้อความถูกยกเลิก";

/** Words of a quoted message (reply), short like the room list. */
export function quoteText(m: MsgInput, now: Date): string {
  const kind = msgKind(m, now);
  if (kind === "img" || kind === "exp") return "รูป";
  return msgLabel(m, now) || "ข้อความ";
}

export const baht = (n: number) => `฿${Math.round(n).toLocaleString("en-US")}`;

/** Short words for the room list and the small chat (mock ChatStore.label). */
export function msgLabel(m: MsgInput, now: Date): string {
  const kind = msgKind(m, now);
  if (kind === "img") return "ส่งรูป";
  if (kind === "exp") return "รูปหมดอายุแล้ว";
  if (kind === "work") return `แชร์ผลงาน ${m.content?.trim() || ""}`.trim();
  if (kind === "file") return "ไฟล์แนบ";
  if (kind === "gone") return UNSENT;
  if (kind === "profile") return "แชร์โปรไฟล์";
  if (kind === "doc") {
    const d = docOf(m.content);
    return `${d.kind} ${d.number}`.trim();
  }
  if (kind === "object") {
    const o = objectOf(m.content);
    return o.id ? `สินค้า ${o.title}` : "สินค้า";
  }
  if (kind === "text") return textOf(m) || (eventOf(m) ? "แชร์อีเวนต์" : "");
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
