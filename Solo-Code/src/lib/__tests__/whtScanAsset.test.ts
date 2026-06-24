import { describe, expect, it } from "vitest";
import { assertWhtStoragePath, WHT_MAX_BYTES } from "../whtScanAsset";

describe("assertWhtStoragePath", () => {
  const uid = "user-abc-123";

  it("accepts paths under the user folder", () => {
    expect(() => assertWhtStoragePath(`${uid}/file.pdf`, uid)).not.toThrow();
  });

  it("rejects path traversal", () => {
    expect(() => assertWhtStoragePath(`${uid}/../other/file.pdf`, uid)).toThrow();
  });

  it("rejects other users' paths", () => {
    expect(() => assertWhtStoragePath("other-user/file.pdf", uid)).toThrow();
  });
});

describe("WHT_MAX_BYTES", () => {
  it("matches dropzone limit (10MB)", () => {
    expect(WHT_MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});
