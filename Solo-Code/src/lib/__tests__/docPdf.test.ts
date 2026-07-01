import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { extractPdfPages, mergePdfBytes } from "../docPdf";

async function singlePagePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  return doc.save();
}

describe("docPdf", () => {
  it("mergePdfBytes combines multiple PDFs", async () => {
    const a = await singlePagePdf();
    const b = await singlePagePdf();
    const merged = await mergePdfBytes([a, b]);
    const doc = await PDFDocument.load(merged);
    expect(doc.getPageCount()).toBe(2);
  });

  it("extractPdfPages keeps selected pages only", async () => {
    const src = await PDFDocument.create();
    src.addPage([100, 100]);
    src.addPage([100, 100]);
    src.addPage([100, 100]);
    const bytes = await src.save();
    const out = await extractPdfPages(bytes, [0, 2]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
  });
});
