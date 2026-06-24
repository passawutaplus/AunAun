import { describe, expect, it, vi } from "vitest";
import { getPrintPdfPlatformHint, isPrintRootReady } from "../printPdf";

describe("getPrintPdfPlatformHint", () => {
  it("returns iOS-specific hint for iPhone", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    expect(getPrintPdfPlatformHint()).toMatch(/บันทึกเป็น PDF/);
    vi.unstubAllGlobals();
  });

  it("returns generic hint on desktop", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
    });
    expect(getPrintPdfPlatformHint()).toMatch(/Save as PDF/);
    vi.unstubAllGlobals();
  });
});

describe("isPrintRootReady", () => {
  it("returns false when print portal is missing", () => {
    document.body.innerHTML = "";
    expect(isPrintRootReady()).toBe(false);
  });

  it("returns true when mockup print root has content", () => {
    document.body.innerHTML =
      '<div class="mockup-print-only"><div class="mockup-print-root"><p>test</p></div></div>';
    expect(isPrintRootReady()).toBe(true);
  });
});
