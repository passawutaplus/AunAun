import { describe, expect, it } from "vitest";
import { filterObjects, formatEditionQuantity, isEditionSoldOut, objectPublishBlockReason, parsePairLines, shopSaleLabel, sortObjectsByPrice, type CreatorObject } from "@/lib/objects/taxonomy";

const item = (patch: Partial<CreatorObject>): CreatorObject => ({
  id: "1",
  owner_id: "owner",
  title: "Line Lamp",
  code: "LT12",
  summary: "โคมโลหะ",
  story: "",
  kind: "made",
  subtype: "light",
  material: "metal",
  fulfillment: "ready",
  edition: "open",
  edition_label: "",
  price_thb: 4200,
  lead_time: "",
  cover_url: null,
  gallery_urls: [],
  finishes: [],
  specs: [],
  downloads: [],
  license_note: "",
  reference_project_ids: [],
  status: "Published",
  created_at: "",
  updated_at: "",
  ...patch,
});

const emptyFilter = {
  kind: "any" as const,
  subtype: "any" as const,
  axis: "any" as const,
  fulfillment: "any" as const,
  edition: "any" as const,
  maxPrice: null,
  search: "",
};

describe("objects taxonomy", () => {
  it("filters by kind and material", () => {
    const rows = [item({}), item({ id: "2", kind: "files", subtype: "template", material: "figma", title: "Kit" })];
    expect(filterObjects(rows, { ...emptyFilter, kind: "files", axis: "figma" }).map((row) => row.id)).toEqual(["2"]);
  });

  it("matches search across title and maker", () => {
    const rows = [item({ maker_name: "นุ่น" })];
    expect(filterObjects(rows, { ...emptyFilter, search: "นุ่น" })).toHaveLength(1);
    expect(filterObjects(rows, { ...emptyFilter, search: "เก้าอี้" })).toHaveLength(0);
  });

  it("parses spec lines and drops incomplete ones", () => {
    expect(parsePairLines("ขนาด | 30 ซม.\nว่าง\nวัสดุ | ไม้")).toEqual([
      { label: "ขนาด", value: "30 ซม." },
      { label: "วัสดุ", value: "ไม้" },
    ]);
  });

  it("treats a full edition count as sold out", () => {
    expect(isEditionSoldOut("unique", "1/1")).toBe(true);
    expect(isEditionSoldOut("limited", "40 / 40")).toBe(true);
    expect(isEditionSoldOut("limited", "Edition : 12 / 12")).toBe(true);
    expect(isEditionSoldOut("limited", "12 / 40")).toBe(false);
    expect(isEditionSoldOut("limited", "80")).toBe(false);
    expect(isEditionSoldOut("open", "1/1")).toBe(false);
  });

  it("shows a limited run as Edition without a unit", () => {
    expect(formatEditionQuantity("limited", "80 เล่ม")).toBe("Edition : 80");
    expect(formatEditionQuantity("limited", "30 ชิ้น")).toBe("Edition : 30");
    expect(formatEditionQuantity("limited", "12 / 40")).toBe("Edition : 12 / 40");
    expect(formatEditionQuantity("unique", "1/1")).toBe("1/1");
    expect(formatEditionQuantity("open", "80")).toBe("");
  });

  it("shows only ready-to-sell and preorder on the shop", () => {
    expect(shopSaleLabel("ready")).toBe("พร้อมส่ง");
    expect(shopSaleLabel("made_to_order")).toBe("พร้อมส่ง");
    expect(shopSaleLabel("preorder")).toBe("พรีออเดอร์");
    expect(shopSaleLabel("download")).toBe("");
    const rows = [
      item({ id: "ready", fulfillment: "ready" }),
      item({ id: "made", fulfillment: "made_to_order" }),
      item({ id: "pre", fulfillment: "preorder" }),
    ];
    expect(filterObjects(rows, { ...emptyFilter, fulfillment: "ready" }).map((row) => row.id)).toEqual(["ready", "made"]);
    expect(filterObjects(rows, { ...emptyFilter, fulfillment: "preorder" }).map((row) => row.id)).toEqual(["pre"]);
  });

  it("sorts the shop by price and leaves the default order alone", () => {
    const rows = [
      item({ id: "mid", price_thb: 2000 }),
      item({ id: "low", price_thb: 800 }),
      item({ id: "high", price_thb: 9000 }),
    ];
    expect(sortObjectsByPrice(rows, "default").map((row) => row.id)).toEqual(["mid", "low", "high"]);
    expect(sortObjectsByPrice(rows, "low").map((row) => row.id)).toEqual(["low", "mid", "high"]);
    expect(sortObjectsByPrice(rows, "high").map((row) => row.id)).toEqual(["high", "mid", "low"]);
  });

  it("blocks publish until a project and KYC are ready", () => {
    expect(objectPublishBlockReason({ hasPublishedProject: false, kycApproved: true })).toMatch(/ผลงาน/);
    expect(objectPublishBlockReason({ hasPublishedProject: true, kycApproved: false })).toMatch(/ตัวตน/);
    expect(objectPublishBlockReason({ hasPublishedProject: true, kycApproved: true })).toBeNull();
  });
});
