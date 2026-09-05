import { describe, expect, it } from "vitest";
import {
  composeHiringPhone,
  parseHiringPhone,
  phoneCountryFlag,
} from "@/lib/phoneCountry";

describe("phone country helpers", () => {
  it("defaults empty values to Thailand", () => {
    expect(parseHiringPhone("")).toEqual({ iso: "TH", national: "" });
    expect(parseHiringPhone("+66 ")).toEqual({ iso: "TH", national: "" });
    expect(composeHiringPhone("TH", "")).toBe("+66 ");
  });

  it("keeps the prefix in a dropdown-friendly pair", () => {
    expect(parseHiringPhone("+66 0866259407")).toEqual({ iso: "TH", national: "0866259407" });
    expect(composeHiringPhone("TH", "0866259407")).toBe("+66 0866259407");
  });

  it("matches the longest calling code first", () => {
    expect(parseHiringPhone("+85212345678").iso).toBe("HK");
    expect(parseHiringPhone("+14155552671").iso).toBe("US");
    expect(composeHiringPhone("SG", "81234567")).toBe("+65 81234567");
  });

  it("builds a flag from the country iso", () => {
    expect(phoneCountryFlag("TH")).toBe("🇹🇭");
  });
});
