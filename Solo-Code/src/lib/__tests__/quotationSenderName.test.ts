import { describe, expect, it } from "vitest";
import { resolveQuotationSenderName } from "@/lib/quotationSenderName";

describe("resolveQuotationSenderName", () => {
  it("prefers org snapshot for inhouse quotes", () => {
    expect(
      resolveQuotationSenderName({
        quotationKind: "inhouse",
        orgSnapshot: { brandName: "Acme Co" },
        profileBrandName: "Solo",
      }),
    ).toBe("Acme Co");
  });

  it("prefers studio snapshot for studio quotes", () => {
    expect(
      resolveQuotationSenderName({
        quotationKind: "studio",
        studioSnapshot: { brandName: "Nest Creative" },
        profileBrandName: "Solo",
      }),
    ).toBe("Nest Creative");
  });

  it("falls back to profile brand for solo quotes", () => {
    expect(
      resolveQuotationSenderName({
        quotationKind: "solo",
        profileBrandName: "My Brand",
      }),
    ).toBe("My Brand");
  });
});
