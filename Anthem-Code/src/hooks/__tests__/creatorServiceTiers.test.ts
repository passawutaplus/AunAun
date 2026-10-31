import { describe, expect, it } from "vitest";
import { applyTiersToInput, tiersOf, type CreatorServiceInput } from "@/hooks/useCreatorServices";

const legacy = {
  tiers: [],
  price_min_thb: 1500,
  price_thb: 3000,
  duration_label: "7 วัน",
  deliverables: ["โลโก้ 1 แบบ"],
  revisions_label: "2 ครั้ง",
  exclusions_note: "ไม่รวมค่าพิมพ์",
};

describe("tiersOf (packages saved before tiers)", () => {
  it("keeps the old duration and revisions", () => {
    const [basic] = tiersOf(legacy);
    expect(basic.duration_days).toBe(7);
    expect(basic.revisions).toBe(2);
    expect(basic.price_thb).toBe(1500);
  });
});

describe("applyTiersToInput", () => {
  const base: CreatorServiceInput = {
    title: "Logo",
    price_thb: 0,
    summary: "Brand mark",
    deliverables: [],
    exclusions_note: "ไม่รวมค่าพิมพ์",
    tiers: [
      {
        name: "Basic",
        summary: "",
        price_thb: 1500,
        duration_days: 7,
        deliverables: ["โลโก้ 1 แบบ"],
        revisions: 2,
        exclusions: "",
      },
    ],
  };

  it("keeps the package-wide exclusions note when tiers carry none", () => {
    expect(applyTiersToInput(base).exclusions_note).toBe("ไม่รวมค่าพิมพ์");
  });

  it("mirrors the cheapest tier into the flat fields", () => {
    const out = applyTiersToInput(base);
    expect(out.duration_label).toBe("7");
    expect(out.revisions_label).toBe("2");
    expect(out.price_min_thb).toBe(1500);
  });
});
