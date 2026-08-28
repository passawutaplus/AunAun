import { describe, expect, it } from "vitest";
import {
  displayOrderCode,
  docNumberYear,
  isSequentialDocNumber,
  makeProvisionalDocNumber,
  makeStableMockDocNumber,
  orderCodeFromMetadata,
} from "@/lib/documents/numbering";

describe("document numbering", () => {
  it("accepts padded sequential numbers from the DB", () => {
    expect(isSequentialDocNumber("QT-2026-0001")).toBe(true);
    expect(isSequentialDocNumber("INV-2026-0012")).toBe(true);
    expect(isSequentialDocNumber("RCP-2026-0100")).toBe(true);
    expect(isSequentialDocNumber("FEE-2026-0003")).toBe(true);
    expect(isSequentialDocNumber("ORD-2026-0001")).toBe(true);
  });

  it("rejects random 3-digit quote numbers and UUID slices", () => {
    expect(isSequentialDocNumber("QT-2026-528")).toBe(false);
    expect(isSequentialDocNumber("98AA235B")).toBe(false);
    expect(isSequentialDocNumber("")).toBe(false);
  });

  it("formats provisional numbers like the DB (PREFIX-year-4 digits)", () => {
    const n = makeProvisionalDocNumber("quotation", new Date("2026-08-27T12:00:00+07:00"));
    expect(n).toMatch(/^QT-2026-\d{4}$/);
  });

  it("keeps mock document numbers stable for the same seed", () => {
    const a = makeStableMockDocNumber("invoice", "98AA235B", new Date("2026-01-01T00:00:00+07:00"));
    const b = makeStableMockDocNumber("invoice", "98AA235B", new Date("2026-01-01T00:00:00+07:00"));
    const c = makeStableMockDocNumber("receipt", "98AA235B", new Date("2026-01-01T00:00:00+07:00"));
    expect(a).toBe(b);
    expect(a).toMatch(/^INV-2026-\d{4}$/);
    expect(c).not.toBe(a);
  });

  it("prefers stored order_code over a truncated UUID", () => {
    expect(displayOrderCode("98aa235b-1111-4000-8000-000000000001", "ORD-2026-0001")).toBe(
      "ORD-2026-0001",
    );
    expect(displayOrderCode("98aa235b-1111-4000-8000-000000000001")).toBe("98AA235B");
    expect(orderCodeFromMetadata({ order_code: "ORD-2026-0004" })).toBe("ORD-2026-0004");
    expect(orderCodeFromMetadata({ offer_number: "QT-2026-0001" })).toBeNull();
  });

  it("uses Bangkok calendar year", () => {
    expect(docNumberYear(new Date("2026-08-27T00:00:00+07:00"))).toBe(2026);
  });
});
