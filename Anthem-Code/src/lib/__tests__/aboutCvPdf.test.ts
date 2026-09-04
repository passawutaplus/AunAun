import { describe, expect, it } from "vitest";
import { aboutCvPdfFilename, jpegDataUrlToA4Pdf } from "@/lib/aboutCvPdf";

describe("aboutCvPdfFilename", () => {
  it("uses the name and strips unsafe characters", () => {
    expect(aboutCvPdfFilename("ภาสวุฒิ แซ่ล้อ")).toBe("ภาสวุฒิ-แซ่ล้อ.pdf");
    expect(aboutCvPdfFilename("a/b:c*d?")).toBe("abcd.pdf");
    expect(aboutCvPdfFilename("   ")).toBe("about-me.pdf");
  });
});

describe("jpegDataUrlToA4Pdf", () => {
  it("wraps a tiny jpeg in a PDF header", () => {
    // 1x1 JPEG
    const jpeg =
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/9k=";
    const blob = jpegDataUrlToA4Pdf(`data:image/jpeg;base64,${jpeg}`);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(100);
  });
});
