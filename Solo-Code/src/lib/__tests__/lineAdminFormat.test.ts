import { describe, expect, it } from "vitest";
import {
  clip,
  deltaText,
  flexDigest,
  flexFeedback,
  flexMember,
  formatDigest,
  formatFeedback,
  formatMember,
  formatMembersBurst,
  formatReport,
  isIgnoredEmail,
} from "../../../supabase/functions/_shared/line-admin-format";

const member = {
  id: "1",
  email: "new.user@gmail.com",
  provider: "google",
  joined_at: "2026-10-30T07:28:00Z",
  username: "newuser",
  display_name: "New User",
  works: 0,
};

describe("isIgnoredEmail", () => {
  it("ignores test accounts", () => {
    expect(isIgnoredEmail("a@example.com")).toBe(true);
    expect(isIgnoredEmail("x@example.test")).toBe(true);
    expect(isIgnoredEmail("Tester@Samecor.com")).toBe(true);
    expect(isIgnoredEmail("me@x.com", [" ME@x.com "])).toBe(true);
  });
  it("lets real users through", () => {
    expect(isIgnoredEmail("real@gmail.com")).toBe(false);
    expect(isIgnoredEmail(null)).toBe(false);
  });
});

describe("clip", () => {
  it("flattens whitespace and truncates", () => {
    expect(clip("a\n\nb   c", 10)).toBe("a b c");
    expect(clip("x".repeat(20), 5)).toBe("xxxx…");
    expect(clip(null, 5)).toBe("");
  });
});

describe("formatters", () => {
  it("member shows the full email", () => {
    const t = formatMember(member);
    expect(t).toContain("new.user@gmail.com");
    expect(t).toContain("Google");
    expect(t).toContain("@newuser");
  });
  it("burst lists members and caps at 10", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...member, id: String(i), email: `u${i}@gmail.com` }));
    const t = formatMembersBurst(many);
    expect(t).toContain("12 คน");
    expect(t).toContain("u9@gmail.com");
    expect(t).not.toContain("u10@gmail.com");
    expect(t).toContain("อีก 2 คน");
  });
  it("feedback and report include admin links", () => {
    const f = formatFeedback({
      ticket_number: "FB-1", kind: "bug", rating: 4, message: "พัง", route: "/feed",
      created_at: "2026-10-30T07:28:00Z", username: "u", from_app: true,
    });
    expect(f).toContain("FB-1");
    expect(f).toContain("จากแอป");
    expect(f).toContain("/admin/feedback");
    const r = formatReport({
      target_type: "project", target_id: "1", reason: "spam", details: null,
      created_at: "2026-10-30T07:28:00Z", reporter: "a", target_owner: "b",
    });
    expect(r).toContain("สแปม");
    expect(r).toContain("/admin/reports");
  });
  it("digest lists works and Android sessions", () => {
    const t = formatDigest({
      total_members: 50, new_members: 3, new_works: 8,
      new_works_list: Array.from({ length: 8 }, (_, i) => ({ title: `w${i}`, owner: "o" })),
      feedback_24h: 1, feedback_open: 2, reports_open: 0, sessions_24h: 40, android_sessions_24h: 5,
    });
    expect(t).toContain("สมาชิกใหม่: 3 (รวม 50)");
    expect(t).toContain("อีก 2 ชิ้น");
    expect(t).toContain("Android 5");
  });
});

describe("flex messages", () => {
  const digest = {
    total_members: 19, new_members: 1, new_works: 1,
    new_works_list: [{ title: "To day", owner: "goodnight" }],
    feedback_24h: 1, feedback_open: 3, reports_open: 0, sessions_24h: 76, android_sessions_24h: 28,
  };
  it("digest is a bubble with icons, a text altText and an admin link", () => {
    const m = flexDigest(digest);
    expect(m.type).toBe("flex");
    if (m.type !== "flex") return;
    expect(m.altText).toContain("สรุปประจำวัน");
    const json = JSON.stringify(m.contents);
    for (const i of ["user-plus", "message", "users"]) expect(json).toContain(`/line-icons/${i}.png`);
    expect(json).toContain("https://samecor.com/admin");
    expect(m.altText.length).toBeLessThanOrEqual(400);
  });
  it("dashboard shows device split, sources, top works and deltas", () => {
    const m = flexDigest({
      ...digest, sessions_prev: 50, views_24h: 269, views_prev: 72,
      devices: { mobile: 30, desktop: 10, android: 28, unknown: 8 },
      sources: [{ label: "QR / NFC", n: 17 }, { label: "Facebook", n: 4 }],
      top_works: [{ title: "To day", owner: "goodnight", views: 7 }],
    });
    const json = JSON.stringify(m);
    expect(json).toContain("มือถือ (เว็บ)");
    expect(json).toContain("คอมพิวเตอร์");
    expect(json).toContain("QR / NFC");
    expect(json).toContain("To day");
    expect(json).toContain("▲ 52%");
    expect(json).toContain("▲ 274%");
  });
  it("deltaText handles empty / equal / down", () => {
    expect(deltaText(5, 0)).toBeNull();
    expect(deltaText(5, undefined)).toBeNull();
    expect(deltaText(5, 5)?.text).toBe("เท่าเมื่อวาน");
    expect(deltaText(5, 10)?.text).toBe("▼ 50%");
  });
  it("member keeps the full email", () => {
    const m = flexMember({ id: "1", email: "full.addr@gmail.com", provider: "email", joined_at: "2026-10-30T07:28:00Z", username: "u", display_name: "U", works: 2 });
    expect(JSON.stringify(m)).toContain("full.addr@gmail.com");
  });
  it("feedback without message or ticket still builds", () => {
    const m = flexFeedback({ ticket_number: null, kind: null, rating: null, message: null, route: null, created_at: "2026-10-30T07:28:00Z", username: null, from_app: false });
    expect(m.type).toBe("flex");
  });
});
