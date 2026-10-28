import { describe, expect, it } from "vitest";
import { safeRelativePath } from "@/lib/safeUrl";
import { safeRelativePath as safeRelativePathExternal } from "@/lib/externalUrl";

describe.each([
  ["safeUrl", safeRelativePath],
  ["externalUrl", safeRelativePathExternal],
])("%s.safeRelativePath open-redirect hardening", (_name, fn) => {
  it.each([
    [String.raw`/\evil.com`],
    ["/\t/evil.com"],
    ["/\n/evil.com"],
    ["/%5Cevil.com"],
    ["/%2Fevil.com"],
    ["//evil.com"],
  ])("rejects %j", (input) => {
    expect(fn(input)).toBe("/");
  });

  it("keeps normal in-app paths", () => {
    expect(fn("/project/abc?ref=push#top")).toBe("/project/abc?ref=push#top");
    expect(fn("/evil.com")).toBe("/evil.com");
  });
});
