import { describe, expect, it } from "vitest";
import {
  emptySubmission,
  isTokenShape,
  normalizeSubmission,
  validateQuick,
  validateStep,
  type InviteSubmission,
} from "@/lib/creatorInvite";
import { inviteCopy } from "@/lib/creatorInviteCopy";
import { eventLabel, outreachTemplate } from "@/lib/creatorInviteAdmin";

function filled(): InviteSubmission {
  const s = emptySubmission({ display_name: "Tanawat K.", discipline: "Photography" });
  s.about.email = "t@example.com";
  s.projects[0] = { ...s.projects[0], title: "Identity", media: ["m1"], rights: true };
  return s;
}

describe("creator invite form rules", () => {
  it("prefills the name and a valid discipline from the invitation", () => {
    const s = emptySubmission({ display_name: "Kenji", discipline: "Photography" });
    expect(s.about.name).toBe("Kenji");
    expect(s.about.discipline).toBe("Photography");
    expect(emptySubmission({ display_name: "x", discipline: "Not a category" }).about.discipline).toBe("");
  });

  it("step 1 needs name, discipline and a valid email", () => {
    const s = emptySubmission(null);
    expect(Object.keys(validateStep(1, s, new Set(), false)).sort()).toEqual(["about.discipline", "about.email", "about.name"]);
    expect(validateStep(1, filled(), new Set(), false)).toEqual({});
  });

  it("step 2 needs a title, one scanned image and the rights checkbox per project", () => {
    const s = filled();
    expect(validateStep(2, s, new Set(["m1"]), false)).toEqual({});
    expect(validateStep(2, s, new Set(), false)).toEqual({ "projects.0.media": true });
    s.projects[0].rights = false;
    s.projects[0].url = "http://insecure";
    expect(validateStep(2, s, new Set(["m1"]), false)).toEqual({ "projects.0.rights": true, "projects.0.url": true });
  });

  it("step 3 requires the unchecked-by-default consent", () => {
    expect(validateStep(3, filled(), new Set(), false)).toEqual({ consent: true });
    expect(validateStep(3, filled(), new Set(), true)).toEqual({});
  });

  it("quick submit asks for fewer fields", () => {
    const s = emptySubmission({ display_name: "A", discipline: null });
    s.about.email = "a@b.co";
    s.quick.portfolio_url = "https://behance.net/a";
    expect(validateQuick(s, true)).toEqual({});
    expect(validateQuick({ ...s, quick: { portfolio_url: "behance.net/a" } }, false)).toEqual({ "quick.portfolio_url": true, consent: true });
  });

  it("normalizes partial server data without losing fields", () => {
    const s = normalizeSubmission({ about: { name: "X" }, projects: [{ title: "P" }, { title: "Q" }, { title: "R" }] });
    expect(s.about.name).toBe("X");
    expect(s.about.email).toBe("");
    expect(s.projects.map((p) => p.slot)).toEqual(["p1", "p2"]);
    expect(s.projects[1].media).toEqual([]);
  });

  it("only accepts 43-char base64url tokens", () => {
    expect(isTokenShape("A".repeat(43))).toBe(true);
    expect(isTokenShape("tanawat-k")).toBe(false);
    expect(isTokenShape("A".repeat(42) + "/")).toBe(false);
  });
});

describe("creator invite copy + admin helpers", () => {
  it("has Thai and English copy for every key", () => {
    const th = inviteCopy("th");
    const en = inviteCopy("en");
    expect(Object.keys(en).sort()).toEqual(Object.keys(th).sort());
    expect(th.pathA).toContain("SAMECOR");
    expect(en.pvBadge).toMatch(/not published/i);
  });

  it("fills the name and link into outreach templates", () => {
    const t = outreachTemplate("dm-en", "Kenji", "https://samecor.com/invite/creator/x");
    expect(t).toContain("Hi Kenji!");
    expect(t).toContain("https://samecor.com/invite/creator/x");
    expect(outreachTemplate("email-th", "", "L")).toContain("คุณ[ชื่อ]");
  });

  it("labels audit events, including email failures", () => {
    expect(eventLabel("submitted")).toBe("ศิลปินส่งข้อมูล");
    expect(eventLabel("email_invite_failed")).toContain("ส่งไม่สำเร็จ");
  });
});
