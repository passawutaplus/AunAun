import { describe, expect, it } from "vitest";
import {
  isProjectRichHtml,
  plainTextToProjectRichHtml,
  sanitizeProjectRichText,
} from "@/lib/projectRichText";

describe("projectRichText", () => {
  it("keeps safe formatting tags", () => {
    const html = sanitizeProjectRichText(
      '<p style="text-align:center"><b>Hi</b> <i>there</i> <u>u</u> <s>s</s></p>',
    );
    expect(html).toContain("<b>Hi</b>");
    expect(html).toContain("<i>there</i>");
    expect(html).toContain("<u>u</u>");
    expect(html).toContain("<s>s</s>");
    expect(html).toContain('text-align:center');
  });

  it("strips scripts and event handlers", () => {
    const html = sanitizeProjectRichText(
      '<p onclick="alert(1)">ok</p><script>alert(2)</script><img src=x onerror=alert(3)>',
    );
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("img");
    expect(html).toContain("ok");
  });

  it("detects rich html vs plain", () => {
    expect(isProjectRichHtml("<b>x</b>")).toBe(true);
    expect(isProjectRichHtml("plain text")).toBe(false);
  });

  it("converts plain newlines to paragraphs", () => {
    const html = plainTextToProjectRichHtml("a\nb");
    expect(html).toContain("<p>a</p>");
    expect(html).toContain("<p>b</p>");
  });

  it("keeps bold when browser uses span font-weight (full selection)", () => {
    const html = sanitizeProjectRichText(
      '<p><span style="font-weight:700">หกดฟหกดฟหก</span></p>',
    );
    expect(html).toContain("<b>หกดฟหกดฟหก</b>");
  });

  it("keeps whitelisted font-family on span", () => {
    const html = sanitizeProjectRichText(
      `<p><span style="font-family:'Sarabun', sans-serif">สวัสดี</span></p>`,
    );
    expect(html).toContain("font-family:");
    expect(html).toMatch(/Sarabun/i);
    expect(html).toContain("สวัสดี");
  });

  it("strips unknown font-family", () => {
    const html = sanitizeProjectRichText(
      `<p><span style="font-family:Comic Sans MS">x</span></p>`,
    );
    expect(html).not.toContain("Comic");
    expect(html).toContain("x");
  });

  it("keeps whitelisted font-size on span", () => {
    const html = sanitizeProjectRichText(
      `<p><span style="font-size:24px">ใหญ่</span></p>`,
    );
    expect(html).toContain("font-size:24px");
    expect(html).toContain("ใหญ่");
  });

  it("strips unknown font-size", () => {
    const html = sanitizeProjectRichText(
      `<p><span style="font-size:99px">x</span></p>`,
    );
    expect(html).not.toContain("99px");
    expect(html).toContain("x");
  });
});
