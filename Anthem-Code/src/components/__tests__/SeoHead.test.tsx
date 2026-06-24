import { describe, expect, it, afterEach } from "vitest";
import { render } from "@testing-library/react";
import SeoHead from "@/components/SeoHead";

describe("SeoHead", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  it("sets noindex robots meta when noindex prop is true", () => {
    render(<SeoHead title="รายได้ของฉัน" path="/earnings" noindex />);
    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute("content")).toBe("noindex, nofollow");
  });

  it("sets index,follow for public pages", () => {
    render(<SeoHead path="/jobs" title="งานจ้างดีไซน์" />);
    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute("content")).toBe("index, follow");
  });

  it("sets absolute canonical link for the page path", () => {
    render(<SeoHead path="/jobs" title="งานจ้างดีไซน์" />);
    const canonical = document.querySelector('link#seo-canonical[rel="canonical"]');
    expect(canonical?.getAttribute("href")).toMatch(/\/jobs$/);
  });
});
