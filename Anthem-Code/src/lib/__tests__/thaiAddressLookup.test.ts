import { describe, expect, it } from "vitest";
import {
  listDistrictsForProvince,
  listSubdistrictsForDistrict,
  resolvePostalCode,
} from "@/lib/thaiAddressLookup";

describe("thaiAddressLookup", () => {
  it("lists districts for Bangkok then subdistricts and a postal code", () => {
    const districts = listDistrictsForProvince("กรุงเทพมหานคร");
    expect(districts).toContain("ปทุมวัน");

    const subdistricts = listSubdistrictsForDistrict("กรุงเทพมหานคร", "ปทุมวัน");
    expect(subdistricts).toContain("ลุมพินี");

    const postal = resolvePostalCode("กรุงเทพมหานคร", "ปทุมวัน", "ลุมพินี");
    expect(postal).toMatch(/^\d{5}$/);
  });

  it("returns no districts until a province is chosen", () => {
    expect(listDistrictsForProvince("")).toEqual([]);
    expect(listSubdistrictsForDistrict("กรุงเทพมหานคร", "")).toEqual([]);
  });
});
