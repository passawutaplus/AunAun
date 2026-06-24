import { describe, expect, it } from "vitest";
import { resolveToolIconSlug, toolIconSources, toolIconUrl } from "@/lib/toolIcons";

describe("toolIcons", () => {
  it("builds theSVG CDN URLs", () => {
    expect(toolIconUrl("figma")).toBe("https://thesvg.org/icons/figma/default.svg");
    expect(toolIconUrl("tailwind-css")).toBe("https://thesvg.org/icons/tailwind-css/default.svg");
  });

  it("prefers bundled local icons for tools missing on theSVG", () => {
    expect(toolIconSources("procreate")[0]).toBe("/tool-icons/procreate.png");
    expect(toolIconSources("procreate")[1]).toContain("thesvg.org");
    expect(toolIconSources("invision")[0]).toBe("/tool-icons/invision.png");
    expect(toolIconSources("zeplin")[0]).toBe("/tool-icons/zeplin.png");
  });

  it("maps common tool names to theSVG slugs", () => {
    expect(resolveToolIconSlug("Photoshop")).toBe("photoshop");
    expect(resolveToolIconSlug("Adobe Illustrator")).toBe("illustrator");
    expect(resolveToolIconSlug("After Effects")).toBe("after-effects");
    expect(resolveToolIconSlug("Tailwind CSS")).toBe("tailwind-css");
    expect(resolveToolIconSlug("VS Code")).toBe("visual-studio-code");
    expect(resolveToolIconSlug("Stable Diffusion")).toBe("stability-ai");
  });

  it("still resolves tools missing from theSVG catalog for letter fallback", () => {
    expect(resolveToolIconSlug("Procreate")).toBe("procreate");
    expect(resolveToolIconSlug("InVision")).toBe("invision");
  });
});
