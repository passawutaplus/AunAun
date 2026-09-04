import { describe, expect, it } from "vitest";
import {
  hydrateAddressFromLocation,
  parseProfileAddressOrLocation,
} from "@/lib/profileAddress";

describe("hydrateAddressFromLocation", () => {
  it("splits a district, province chip into dropdown fields", () => {
    expect(hydrateAddressFromLocation("บางแค, กรุงเทพมหานคร")).toEqual({
      line1: "",
      subdistrict: "",
      district: "บางแค",
      province: "กรุงเทพมหานคร",
      postalCode: "",
    });
  });

  it("maps a province-only location", () => {
    expect(hydrateAddressFromLocation("กรุงเทพฯ").province).toBe("กรุงเทพมหานคร");
  });
});

describe("parseProfileAddressOrLocation", () => {
  it("prefers the structured address over the location chip", () => {
    expect(
      parseProfileAddressOrLocation(
        { district: "ปทุมวัน", province: "กรุงเทพมหานคร" },
        "บางแค, กรุงเทพมหานคร",
      ),
    ).toMatchObject({
      district: "ปทุมวัน",
      province: "กรุงเทพมหานคร",
    });
  });
});
