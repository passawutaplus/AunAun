import { describe, expect, it } from "vitest";
import type { Notification } from "@/core/notifications";
import type { HomeEventRow } from "@/server/queries/homeEvents";
import { actorOf, isShownNotification, notificationTime, toNotificationRow } from "../notificationRows";

const NOW = new Date(2026, 10, 28, 9, 0); // Sat 28 Nov 2026, 09:00 local

const note = (over: Partial<Notification>): Notification => ({
  id: "n1",
  user_id: "me",
  app: "anthem",
  kind: "chat.message",
  title: "",
  body: "",
  link: "",
  metadata: {},
  is_read: false,
  is_dismissed: false,
  created_at: new Date(2026, 10, 28, 8, 5).toISOString(),
  ...over,
});

const people: Record<string, { name: string; avatar: string }> = { u1: { name: "mintra.k", avatar: "https://x/a.png" } };
const ev: HomeEventRow = {
  id: "e1", title: "Riso Open Studio", category: "workshop", starts_on: "2026-11-29", ends_on: "2026-11-29",
  time_note: null, location_name: "BACC", area: null, cover_url: "https://x/c.png", origin: null,
  is_featured: null, featured_until: null, parent_id: null, sort_order: null, slug: null,
};
const ctx = {
  now: NOW,
  person: (id: string | null) => (id ? people[id] ?? null : null),
  event: (id: string | null) => (id === "e1" ? ev : id === "oc" ? { ...ev, id: "oc", category: "open_call", ends_on: "2026-11-30" } : null),
};

describe("notification rows", () => {
  it("shows only the kinds of the new design", () => {
    expect(isShownNotification(note({ kind: "chat.message" }))).toBe(true);
    expect(isShownNotification(note({ kind: "event_reminder" }))).toBe(true);
    for (const kind of ["hire_application", "kyc_approved", "kyc_rejected", "asset_scan_clean", "project_collab_invite", "like"]) {
      expect(isShownNotification(note({ kind }))).toBe(false);
    }
  });

  it("chat message: sender, quoted text, time of day", () => {
    const n = note({ title: "mintra.k ส่งข้อความ", body: "ฟอนต์ในโปสเตอร์ใช้อะไรเหรอ", link: "/chat/c1", metadata: { sender_id: "u1" } });
    expect(actorOf(n)).toBe("u1");
    expect(toNotificationRow(n, ctx)).toMatchObject({
      who: "mintra.k", what: "ส่งข้อความ · “ฟอนต์ในโปสเตอร์ใช้อะไรเหรอ”", time: "08:05", unread: true, round: true, href: "/chat/c1",
    });
  });

  it("falls back to the handle in the title until the profile loads", () => {
    const n = note({ kind: "social.follow", title: "nok.studio เริ่มติดตามคุณ", metadata: { follower_id: "u9" } });
    expect(toNotificationRow(n, ctx)).toMatchObject({ who: "nok.studio", what: "เริ่มติดตามคุณ", picture: "" });
  });

  it("comment names the work from the title", () => {
    const n = note({ kind: "project.comment", title: "Ploy คอมเมนต์ผลงาน “Night Bus”", body: "ชอบสีน้ำเงิน", metadata: { commenter_id: "u1" } });
    expect(toNotificationRow(n, ctx).what).toBe("คอมเมนต์ใน Night Bus · “ชอบสีน้ำเงิน”");
  });

  it("event reminder: event picture, day word, date and venue", () => {
    const n = note({ kind: "event_reminder", title: "งานที่คุณสนใจเริ่มพรุ่งนี้", body: "Riso Open Studio · BACC", metadata: { event_id: "e1", starts_on: "2026-11-29" } });
    expect(toNotificationRow(n, ctx)).toMatchObject({
      who: "Riso Open Studio", what: "อีเว้นท์ที่คุณสนใจ · พรุ่งนี้ 29 พ.ย. · BACC", round: false, picture: "https://x/c.png",
    });
  });

  it("open call reminder counts the days left", () => {
    const n = note({ kind: "event_reminder", body: "Mascot · BACC", metadata: { event_id: "oc" } });
    expect(toNotificationRow(n, ctx).what).toBe("Open call ที่คุณสนใจ · ปิดรับใน 2 วัน");
  });

  it("time: today, yesterday, days, then a date", () => {
    expect(notificationTime(new Date(2026, 10, 27, 23, 0).toISOString(), NOW)).toBe("เมื่อวาน");
    expect(notificationTime(new Date(2026, 10, 25, 12, 0).toISOString(), NOW)).toBe("3 วันก่อน");
    expect(notificationTime(new Date(2026, 10, 10, 12, 0).toISOString(), NOW)).toBe("10 พ.ย.");
  });
});
