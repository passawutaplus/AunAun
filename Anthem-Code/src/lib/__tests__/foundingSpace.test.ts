import { afterEach, describe, expect, it, vi } from "vitest";
import { isLaunchHiddenPath } from "@/lib/aplus1Launch";
import { PICKER_FIRST_30, campaignCta, cleanWaitlistEmail, findCampaign } from "@/lib/founding/campaign";
import { isFoundingEnabled, isFoundingPath, isFoundingTest } from "@/lib/founding/flags";
import { FOUNDING } from "@/lib/i18n/founding";
import { findProduct } from "@/lib/support/catalog";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("founding projects: flag and route gate", () => {
  it("is off unless switched on (tests and production builds)", () => {
    expect(isFoundingEnabled()).toBe(false);
    expect(isFoundingTest()).toBe(false);
    vi.stubEnv("VITE_FOUNDING_ENABLED", "true");
    expect(isFoundingEnabled()).toBe(true);
  });

  it.each(["/founding", "/founding/picker"])("%s is hidden while off and open once on", (path) => {
    vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
    expect(isFoundingPath(path)).toBe(true);
    expect(isLaunchHiddenPath(path)).toBe(true);
    vi.stubEnv("VITE_FOUNDING_ENABLED", "true");
    expect(isFoundingPath(path)).toBe(false);
    expect(isLaunchHiddenPath(path)).toBe(false);
  });

  it("does not swallow look-alike paths", () => {
    expect(isFoundingPath("/founders")).toBe(false);
    expect(isFoundingPath("/foundingx")).toBe(false);
  });
});

describe("Picker, The First 30: only confirmed facts", () => {
  const c = PICKER_FIRST_30;

  it("is a waitlist for 30 devices with nothing undecided filled in", () => {
    expect(c.status).toBe("waitlist");
    expect(c.deviceCap).toBe(30);
    expect(c.priceThb).toBeNull();
    expect(c.goalThb).toBeNull();
    expect(c.startsAt).toBeNull();
    expect(c.endsAt).toBeNull();
  });

  it("links to the existing product page instead of a second product", () => {
    expect(findProduct("picker", false)?.foundingPath).toBe(`/founding/${c.slug}`);
    expect(c.productPath).toBe("/shop/picker");
    expect(findCampaign("picker")).toBe(c);
    expect(findCampaign("nope")).toBeNull();
  });

  it("shows six milestones and marks nothing after hardware validation as done", () => {
    expect(c.milestones.map((m) => m.no)).toEqual(["01", "02", "03", "04", "05", "06"]);
    expect(c.milestones.slice(2).some((m) => m.status === "completed")).toBe(false);
    expect(c.milestones[2].status).toBe("in_progress");
  });

  it("has copy for every milestone, question and risk", () => {
    const keys = [...c.milestones.map((m) => m.noteKey), ...c.faq.flatMap((f) => [f.qKey, f.aKey]), ...c.riskKeys];
    for (const k of keys) expect(FOUNDING, k).toHaveProperty(k);
    expect(c.faq).toHaveLength(6);
    expect(c.riskKeys).toHaveLength(5);
  });

  it("takes money only while live", () => {
    expect(campaignCta("waitlist")).toBe("waitlist");
    expect(campaignCta("scheduled")).toBe("waitlist");
    expect(campaignCta("live")).toBe("back");
    expect(campaignCta("draft")).toBe("none");
    for (const s of ["ended", "succeeded", "failed", "production", "fulfillment", "closed"] as const) {
      expect(campaignCta(s)).toBe("updates");
    }
  });
});

describe("waitlist email", () => {
  it("tidies a good address", () => {
    expect(cleanWaitlistEmail("  QA@Example.com ")).toBe("qa@example.com");
  });

  it.each(["", "qa@example", "qa example@x.com", "@x.com", `${"a".repeat(250)}@x.com`])("rejects %s", (raw) => {
    expect(cleanWaitlistEmail(raw)).toBeNull();
  });
});

describe("founding dictionary", () => {
  const entries = Object.entries(FOUNDING);

  it("has every string in th, en and zh with the same placeholders", () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const [key, e] of entries) {
      for (const lang of ["th", "en", "zh"] as const) expect(e[lang]?.trim(), `${key}.${lang}`).toBeTruthy();
      expect(vars(e.en), key).toBe(vars(e.th));
      expect(vars(e.zh), key).toBe(vars(e.th));
    }
  });

  it("labels device drawings as mock-ups", () => {
    expect(FOUNDING.mockLabel.th).toBe("ภาพจำลองต้นแบบเท่านั้น");
  });

  it("makes none of the claims the spec forbids", () => {
    const all = entries.map(([, e]) => `${e.th} ${e.en} ${e.zh}`).join(" ");
    // No accuracy figures, no paint-brand "partners", no "every phone", no guarantee, no "AI".
    expect(all).not.toMatch(/ΔE|delta\s?e|\d\s?%/i);
    expect(all).not.toMatch(/TOA|Beger|Jotun|Dulux|Captain|Delta/);
    expect(all).not.toMatch(/ทุกมือถือ|every phone|all phones|guarantee|รับประกัน|\bAI\b/i);
    expect(all).not.toMatch(/ผู้ถือหุ้น|ผู้ลงทุน|shareholder|investor/i);
  });

  it("keeps Thai lines short", () => {
    for (const [key, e] of entries) expect(e.th.length, key).toBeLessThanOrEqual(64);
  });
});
