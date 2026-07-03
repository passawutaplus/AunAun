import { describe, expect, it } from "vitest";
import { createProjectLinkAsset, createProjectFileAsset } from "@/lib/projectAssets";
import { applyScanResult, evaluateProjectAssetOnAdd } from "@/lib/projectAssetScan";

describe("projectAssetScan", () => {
  it("blocks javascript URLs", () => {
    const asset = createProjectLinkAsset("bad", "javascript:alert(1)");
    const result = evaluateProjectAssetOnAdd(asset);
    expect(result.scan_status).toBe("blocked");
  });

  it("marks suspicious short links as pending", () => {
    const asset = createProjectLinkAsset("short", "https://bit.ly/abc");
    const result = evaluateProjectAssetOnAdd(asset);
    expect(result.scan_status).toBe("pending");
  });

  it("queues valid files for deep scan", () => {
    const asset = createProjectFileAsset({
      label: "guide",
      storage_path: "user-id/folder/assets/file.pdf",
      file_name: "file.pdf",
      mime_type: "application/pdf",
      size_bytes: 1000,
    });
    const result = evaluateProjectAssetOnAdd(asset);
    expect(result.scan_status).toBe("pending");
  });

  it("allows normal https links", () => {
    const asset = createProjectLinkAsset("figma", "https://figma.com/file/abc");
    const scanned = applyScanResult(asset, evaluateProjectAssetOnAdd(asset));
    expect(scanned.scan_status).toBe("clean");
  });
});
