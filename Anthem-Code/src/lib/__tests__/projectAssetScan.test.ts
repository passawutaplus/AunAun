import { describe, expect, it } from "vitest";
import { createProjectLinkAsset, createProjectFileAsset } from "@/lib/projectAssets";
import {
  applyScanResult,
  assertProjectAssetSafeToOpen,
  evaluateExternalLinkUrl,
  evaluateProjectAssetOnAdd,
  looksLikeCompleteExternalUrl,
} from "@/lib/projectAssetScan";

describe("projectAssetScan", () => {
  it("blocks javascript URLs", () => {
    const asset = createProjectLinkAsset("bad", "javascript:alert(1)");
    const result = evaluateProjectAssetOnAdd(asset);
    expect(result.scan_status).toBe("blocked");
  });

  it("blocks URL shorteners", () => {
    const asset = createProjectLinkAsset("short", "https://bit.ly/abc");
    const result = evaluateProjectAssetOnAdd(asset);
    expect(result.scan_status).toBe("blocked");
    expect(result.scan_reason).toMatch(/ลิงก์ย่อ/);
  });

  it("blocks localhost and private IPs", () => {
    expect(evaluateExternalLinkUrl("http://localhost/x").scan_status).toBe("blocked");
    expect(evaluateExternalLinkUrl("http://127.0.0.1/x").scan_status).toBe("blocked");
    expect(evaluateExternalLinkUrl("http://192.168.1.1/x").scan_status).toBe("blocked");
    expect(evaluateExternalLinkUrl("http://10.0.0.5/x").scan_status).toBe("blocked");
  });

  it("blocks credentials in URL", () => {
    const result = evaluateExternalLinkUrl("https://user:pass@example.com/path");
    expect(result.scan_status).toBe("blocked");
  });

  it("blocks dangerous download paths", () => {
    const result = evaluateExternalLinkUrl("https://cdn.example.com/setup.exe");
    expect(result.scan_status).toBe("blocked");
    expect(result.scan_reason).toMatch(/อันตราย/);
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

  it("detects complete URLs for live feedback", () => {
    expect(looksLikeCompleteExternalUrl("fig")).toBe(false);
    expect(looksLikeCompleteExternalUrl("figma.com")).toBe(true);
    expect(looksLikeCompleteExternalUrl("https://figma.com/file/x")).toBe(true);
  });

  it("click-time gate blocks pending and blocked assets", () => {
    const pending = createProjectLinkAsset("x", "https://figma.com/a");
    expect(assertProjectAssetSafeToOpen(pending).ok).toBe(false);

    const blocked = applyScanResult(
      createProjectLinkAsset("bad", "https://bit.ly/x"),
      evaluateProjectAssetOnAdd(createProjectLinkAsset("bad", "https://bit.ly/x")),
    );
    expect(assertProjectAssetSafeToOpen(blocked).ok).toBe(false);
  });

  it("click-time gate re-checks clean links and allows safe ones", () => {
    const clean = applyScanResult(
      createProjectLinkAsset("figma", "https://figma.com/file/abc"),
      evaluateProjectAssetOnAdd(createProjectLinkAsset("figma", "https://figma.com/file/abc")),
    );
    const gate = assertProjectAssetSafeToOpen(clean);
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.url).toContain("figma.com");

    const stale = {
      ...clean,
      url: "https://bit.ly/evil",
      scan_status: "clean" as const,
    };
    expect(assertProjectAssetSafeToOpen(stale).ok).toBe(false);
  });

  it("click-time gate re-checks file rules", () => {
    const file = applyScanResult(
      createProjectFileAsset({
        label: "guide",
        storage_path: "user-id/folder/assets/file.pdf",
        file_name: "file.pdf",
        mime_type: "application/pdf",
        size_bytes: 1000,
      }),
      { scan_status: "clean", scan_reason: null },
    );
    expect(assertProjectAssetSafeToOpen(file).ok).toBe(true);

    const badExt = {
      ...file,
      file_name: "payload.exe",
      storage_path: "user-id/folder/assets/payload.exe",
    };
    expect(assertProjectAssetSafeToOpen(badExt).ok).toBe(false);
  });
});
