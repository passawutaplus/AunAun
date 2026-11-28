import type { Notification } from "@/core/notifications";
import type { HomeEventRow } from "@/server/queries/homeEvents";
import { dayOf, isoDay } from "../main/useHomeEvents";

/**
 * Rows of the notification panel (mock: ChatDock.dc.html "การแจ้งเตือน"). The mock has five kinds:
 * a chat message, a comment on your work, a new follower, an event you are interested in, an open call
 * closing. The inbox also holds kinds of the old site (hiring, collab, KYC, payouts …) that the new design
 * removed: only the kinds below are shown, everything else stays on the old /notifications page.
 */
type Shape = "person" | "event" | "plain";

const SHOWN: Record<string, Shape> = {
  "chat.message": "person",
  "social.follow": "person",
  explore_follow: "person",
  "project.comment": "person",
  "project.comment_reply": "person",
  comment: "person",
  event_reminder: "event",
  feedback_status: "plain",
  admin_feedback: "plain",
  "system.announcement": "plain",
};

export const isShownNotification = (n: Notification) => n.kind in SHOWN;

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Who did it: the person whose avatar and name lead the row. */
export function actorOf(n: Notification): string | null {
  const m = n.metadata;
  return str(m.sender_id) ?? str(m.follower_id) ?? str(m.commenter_id) ?? str(m.actor_id);
}

export type NotificationRow = {
  id: string;
  href: string;
  who: string;
  what: string;
  time: string;
  unread: boolean;
  /** Round avatar (people) or a 5px-corner picture (events). */
  round: boolean;
  picture: string;
};

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const thDate = (d: Date) => `${d.getDate()} ${TH_MONTHS[d.getMonth()]}`;

/** Mock: "18:02" today, "เมื่อวาน", "2 วันก่อน", then a date. */
export function notificationTime(iso: string, now = new Date()): string {
  const t = new Date(iso);
  const days = Math.round((dayOf(isoDay(now)).getTime() - dayOf(isoDay(t)).getTime()) / 86_400_000);
  if (days <= 0) return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  if (days === 1) return "เมื่อวาน";
  if (days < 7) return `${days} วันก่อน`;
  return thDate(t);
}

/** "วันนี้", "พรุ่งนี้", "อีก n วัน" before the event's day (mock dayWord), or nothing once it started. */
function dayWord(startIso: string, now: Date): string {
  const days = Math.round((dayOf(startIso).getTime() - dayOf(isoDay(now)).getTime()) / 86_400_000);
  if (days < 0) return "";
  return days === 0 ? "วันนี้" : days === 1 ? "พรุ่งนี้" : `อีก ${days} วัน`;
}

const quoted = (s: string) => (s.trim() ? `“${s.trim()}”` : "");
const joinDot = (...parts: string[]) => parts.filter(Boolean).join(" · ");

type Ctx = {
  /** Name + avatar of the person in `actorOf`. */
  person: (id: string | null) => { name: string; avatar: string } | null;
  event: (id: string | null) => HomeEventRow | null;
  now: Date;
};

export function toNotificationRow(n: Notification, ctx: Ctx): NotificationRow {
  const shape = SHOWN[n.kind] ?? "plain";
  const base = { id: n.id, href: n.link || "/notifications", time: notificationTime(n.created_at, ctx.now), unread: !n.is_read };

  if (shape === "person") {
    const p = ctx.person(actorOf(n));
    // The stored title starts with the sender's handle ("passawut.a.plus ส่งข้อความ"); use it until the profile loads.
    const who = p?.name || n.title.split(" ")[0] || "Samecor";
    const work = /“(.+?)”/.exec(n.title)?.[1] ?? "";
    const what =
      n.kind === "chat.message" ? joinDot("ส่งข้อความ", quoted(n.body))
      : n.kind === "social.follow" || n.kind === "explore_follow" ? "เริ่มติดตามคุณ"
      : n.kind === "project.comment_reply" ? joinDot("ตอบคอมเมนต์ของคุณ", quoted(n.body))
      : joinDot(work ? `คอมเมนต์ใน ${work}` : "คอมเมนต์ผลงานของคุณ", quoted(n.body));
    return { ...base, who, what, round: true, picture: p?.avatar ?? "" };
  }

  if (shape === "event") {
    const e = ctx.event(str(n.metadata.event_id));
    // Stored body: "<event title> · <venue>".
    const [titlePart, ...rest] = n.body.split(" · ");
    const who = e?.title || titlePart || n.title;
    const venue = e?.location_name || rest.join(" · ");
    let what: string;
    if (e?.category === "open_call" && e.ends_on) {
      const left = Math.round((dayOf(e.ends_on).getTime() - dayOf(isoDay(ctx.now)).getTime()) / 86_400_000);
      what = joinDot("Open call ที่คุณสนใจ", left > 0 ? `ปิดรับใน ${left} วัน` : left === 0 ? "ปิดรับวันนี้" : "ปิดรับแล้ว");
    } else {
      const start = str(n.metadata.starts_on) ?? e?.starts_on ?? null;
      const when = start ? `${dayWord(start, ctx.now)} ${thDate(dayOf(start))}`.trim() : "";
      what = joinDot("อีเว้นท์ที่คุณสนใจ", when, venue);
    }
    return { ...base, who, what, round: false, picture: e?.cover_url ?? "" };
  }

  return { ...base, who: n.title || "Samecor", what: n.body, round: true, picture: "" };
}
