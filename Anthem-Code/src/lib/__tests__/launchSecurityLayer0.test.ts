import { describe, expect, it } from "vitest";
import {
  isOwnProfile,
  profileReadTable,
  PROFILES_PRIVATE_TABLE,
  PROFILES_PUBLIC_TABLE,
} from "@/lib/profileAccess";
import {
  encodeReportEvidenceRef,
  parseReportEvidenceRef,
} from "@/lib/reportEvidenceStorage";
import { openSafeExternalUrl, safeHttpUrl } from "@/lib/safeUrl";

describe("profileAccess", () => {
  it("uses private table for own profile", () => {
    expect(profileReadTable("u1", "u1")).toBe(PROFILES_PRIVATE_TABLE);
    expect(isOwnProfile("u1", "u1")).toBe(true);
  });

  it("uses public view for other profiles", () => {
    expect(profileReadTable("u1", "u2")).toBe(PROFILES_PUBLIC_TABLE);
    expect(isOwnProfile("u1", "u2")).toBe(false);
  });
});

describe("reportEvidenceStorage", () => {
  it("round-trips bucket:path refs", () => {
    const ref = encodeReportEvidenceRef("user/abc.png");
    expect(parseReportEvidenceRef(ref)).toEqual({
      bucket: "report-evidence",
      path: "user/abc.png",
    });
  });
});

describe("safeUrl", () => {
  it("blocks javascript urls", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeUndefined();
  });

  it("allows https urls", () => {
    expect(safeHttpUrl("https://example.com/x")).toBe("https://example.com/x");
  });

  it("openSafeExternalUrl returns false for unsafe urls", () => {
    expect(openSafeExternalUrl("javascript:alert(1)")).toBe(false);
  });
});
