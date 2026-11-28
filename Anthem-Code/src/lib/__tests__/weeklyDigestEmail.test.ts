import { describe, expect, it, vi } from "vitest";
import {
  emailImageUrl,
  lastWeek,
  planDigest,
  rangeLabel,
  renderDigest,
  weekStarting,
  type Board,
  type DigestMember,
} from "../../../../Solo-Code/supabase/functions/weekly-digest/digest";
import { signWeeklyOff, verifyWeeklyOff, weeklyOffPageUrl } from "../../../../Solo-Code/supabase/functions/weekly-digest/links";

// The edge function's shared layout reads the site URL from Deno.env (unset here → https://samecor.com).
// Typed here so tsc can check the imported edge-function files; stubbed before the describe blocks render.
declare global {
  var Deno: { env: { get(key: string): string | undefined } };
}
vi.stubGlobal("Deno", { env: { get: () => undefined } });

const SITE = "https://samecor.com";
const week = weekStarting("2026-11-23")!;

const member = (over: Partial<DigestMember> = {}): DigestMember => ({
  user_id: "11111111-2222-4333-8444-555555555555",
  email: "someone@example.com",
  display_name: "Mali",
  username: "mali",
  sc_categories: ["Character"],
  views: 0,
  followers: 0,
  likes: 0,
  top_work: null,
  works: [{ status: "Published", sc_category: "Character", tags: ["mascot"], tools: [] }],
  ...over,
});

const board: Board = {
  open_calls: [
    {
      id: "c1",
      slug: null,
      title: "PAP 2027: Open Call",
      description: "performance art",
      insights: null,
      location_name: null,
      starts_on: null,
      ends_on: "2026-12-06",
      closes_on: "2026-12-06",
    },
    {
      id: "c2",
      slug: null,
      title: "ประกวดออกแบบและตั้งชื่อ Mascot",
      description: "",
      insights: null,
      cover_url: "https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/project-media/e/mascot.png",
      cover_width: 1600,
      cover_height: 900,
      location_name: null,
      starts_on: null,
      ends_on: "2026-12-10",
      closes_on: "2026-12-10",
    },
  ],
  events: Array.from({ length: 10 }, (_, i) => ({
    id: `e${i}`,
    slug: null,
    title: `Event ${i}`,
    category: i % 2 ? "workshop" : "meetup",
    location_name: i === 0 ? "Attika Studio" : null,
    starts_on: "2026-12-02",
    ends_on: null,
    is_featured: false,
  })),
};

describe("weeks (Bangkok, Mon–Sun)", () => {
  it("sums up the week before the sending Monday", () => {
    expect(lastWeek(new Date("2026-11-30T02:00:00Z"))).toEqual({ start: "2026-11-23", end: "2026-11-29", sendDay: "2026-11-30" });
    // Monday 00:30 in Bangkok is still Sunday in UTC.
    expect(lastWeek(new Date("2026-11-29T17:30:00Z")).start).toBe("2026-11-23");
    // Sunday 23:30 in Bangkok: the week is not over yet.
    expect(lastWeek(new Date("2026-11-29T16:30:00Z")).start).toBe("2026-11-16");
  });

  it("only takes a Monday as week_start", () => {
    expect(weekStarting("2026-11-24")).toBeNull();
    expect(weekStarting("nope")).toBeNull();
    expect(rangeLabel(week)).toBe("23–29 พ.ย.");
    expect(rangeLabel(weekStarting("2026-11-30")!)).toBe("30 พ.ย. – 6 ธ.ค.");
  });
});

describe("who gets an e-mail", () => {
  it("skips people with nothing to report", () => {
    const nobody = member({ works: [], sc_categories: [] });
    expect(planDigest(nobody, board)).toEqual({ send: false, reason: "nothing_to_report" });
  });

  it("sends when an open call fits their work, even without numbers", () => {
    const plan = planDigest(member(), board);
    expect(plan.send).toBe(true);
    if (!plan.send) return;
    expect(plan.hasStats).toBe(false);
    expect(plan.calls[0].call.id).toBe("c2");
    expect(plan.calls[0].score).toBeGreaterThan(0);
  });

  it("sends when they had views, followers or likes", () => {
    const plan = planDigest(member({ works: [], sc_categories: [], followers: 1 }), board);
    expect(plan.send && plan.hasStats).toBe(true);
  });
});

describe("the e-mail", () => {
  const m = member({
    views: 1234,
    followers: 3,
    likes: 15,
    top_work: {
      id: "w1",
      title: "Sticker <set>",
      cover_url: "https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/portfolio/a/b.jpg",
      cover_width: 800,
      cover_height: 2400,
      views: 900,
      likes: 9,
    },
  });
  const plan = planDigest(m, board);
  if (!plan.send) throw new Error("expected a plan");
  const mail = renderDigest(m, plan, week, { site: SITE, unsubscribeUrl: weeklyOffPageUrl(SITE, m.user_id, "tok") });

  it("has the week, the numbers and the top work", () => {
    expect(mail.subject).toBe("[SAMECOR] สรุปประจำสัปดาห์ 23–29 พ.ย.");
    expect(mail.preview).toBe("Views 1,234 · New followers 3 · Likes 15");
    expect(mail.html).toContain("1,234");
    expect(mail.html).toContain(`${SITE}/showcase/w1`);
    expect(mail.html).toContain("Sticker &lt;set&gt;");
    expect(mail.html).not.toContain("<set>");
    // Tall picture: narrower, never cropped.
    expect(mail.html).toMatch(/width="187" height="560"/);
    expect(mail.html).toContain(emailImageUrl(m.top_work!.cover_url!, SITE).replace(/&/g, "&amp;"));
  });

  it("lists up to 3 open calls and 4 events, with a link to the rest", () => {
    expect(mail.html).toContain("ปิดรับ 10 ธ.ค. · เหลือ 10 วัน");
    expect(mail.html.match(/\/exhibition\/e\d/g)?.length).toBe(4);
    expect(mail.html).toContain("ดู Event สัปดาห์นี้ทั้งหมด 10 งาน");
    expect(mail.html).toContain("พ. 2 ธ.ค. · Meetup · Attika Studio");
  });

  it("shows a thumbnail tile on every row, the cover fitted inside (owner 2026-11-28)", () => {
    // 3 + 4 rows, each with an 80×60 tile; only the Mascot call has a cover (wide → 80×45, resized to 256).
    expect(mail.html.match(/height="60" align="center"/g)?.length).toBe(6);
    expect(mail.html).toContain('width="80" height="45"');
    expect(mail.html).toContain(encodeURIComponent("project-media/e/mascot.png") + "&amp;w=256");
  });

  it("has the one-click turn-off link and the redesign settings page", () => {
    expect(mail.html).toContain(`${SITE}/email/off?u=${m.user_id}&amp;t=tok`);
    expect(mail.html).toContain("เลิกรับอีเมลนี้");
    expect(mail.html).toContain(`${SITE}/settings?tab=Notifications`);
    expect(mail.text).toContain(`${SITE}/email/off?u=${m.user_id}&t=tok`);
  });

  it("never says AI", () => {
    expect(mail.html).not.toMatch(/\bAI\b/);
    expect(mail.text).not.toMatch(/\bAI\b/);
  });
});

describe("turn-off links", () => {
  it("verifies its own signature only", async () => {
    const uid = "11111111-2222-4333-8444-555555555555";
    const t = await signWeeklyOff(uid, "secret-a");
    expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(await verifyWeeklyOff(uid, t, ["secret-a"])).toBe(true);
    expect(await verifyWeeklyOff(uid, t, ["other", "secret-a"])).toBe(true);
    expect(await verifyWeeklyOff(uid, t, ["other"])).toBe(false);
    expect(await verifyWeeklyOff("22222222-2222-4333-8444-555555555555", t, ["secret-a"])).toBe(false);
    expect(await verifyWeeklyOff("not-a-uuid", t, ["secret-a"])).toBe(false);
  });
});
