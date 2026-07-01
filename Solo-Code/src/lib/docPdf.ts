import { PDFDocument, degrees, type PDFPage } from "pdf-lib";

export async function loadPdfBytes(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

export async function mergePdfBytes(parts: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const part of parts) {
    const src = await loadPdfBytes(part);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}

export async function extractPdfPages(bytes: Uint8Array, pageIndices: number[]): Promise<Uint8Array> {
  const src = await loadPdfBytes(bytes);
  const dst = await PDFDocument.create();
  const sorted = [...new Set(pageIndices)]
    .filter((i) => i >= 0 && i < src.getPageCount())
    .sort((a, b) => a - b);
  const pages = await dst.copyPages(src, sorted);
  pages.forEach((p) => dst.addPage(p));
  return dst.save();
}

export async function rotatePdfPage(
  bytes: Uint8Array,
  pageIndex: number,
  rotationDegrees: 90 | 180 | 270,
): Promise<Uint8Array> {
  const doc = await loadPdfBytes(bytes);
  if (pageIndex < 0 || pageIndex >= doc.getPageCount()) {
    throw new Error("ไม่พบหน้าที่เลือก");
  }
  const page = doc.getPage(pageIndex);
  const current = page.getRotation().angle;
  page.setRotation(degrees(current + rotationDegrees));
  return doc.save();
}

export async function imagesToPdf(imageBlobs: { bytes: Uint8Array; mimeType: string }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const img of imageBlobs) {
    let embedded;
    if (img.mimeType === "image/png") {
      embedded = await doc.embedPng(img.bytes);
    } else if (img.mimeType === "image/jpeg" || img.mimeType === "image/jpg") {
      embedded = await doc.embedJpg(img.bytes);
    } else {
      throw new Error(`รองรับเฉพาะ PNG/JPG — ได้รับ ${img.mimeType}`);
    }
    const page = doc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
  }
  return doc.save();
}

export async function fileToBytes(file: File | Blob): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

export async function mergeFilesToPdf(files: File[]): Promise<Uint8Array> {
  const pdfParts: Uint8Array[] = [];
  const imageParts: { bytes: Uint8Array; mimeType: string }[] = [];

  for (const file of files) {
    const bytes = await fileToBytes(file);
    const mime = file.type || "application/octet-stream";
    if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      pdfParts.push(bytes);
    } else if (mime.startsWith("image/")) {
      imageParts.push({ bytes, mimeType: mime });
    } else {
      throw new Error(`ไม่รองรับไฟล์: ${file.name}`);
    }
  }

  const chunks: Uint8Array[] = [...pdfParts];
  if (imageParts.length > 0) {
    chunks.push(await imagesToPdf(imageParts));
  }
  if (chunks.length === 0) throw new Error("ไม่มีไฟล์ที่รวมได้");
  if (chunks.length === 1) return chunks[0];
  return mergePdfBytes(chunks);
}

export function pdfPageCount(bytes: Uint8Array): Promise<number> {
  return loadPdfBytes(bytes).then((d) => d.getPageCount());
}

export type PdfPageInfo = { index: number; width: number; height: number };

export async function getPdfPageInfos(bytes: Uint8Array): Promise<PdfPageInfo[]> {
  const doc = await loadPdfBytes(bytes);
  return doc.getPages().map((page: PDFPage, index) => {
    const { width, height } = page.getSize();
    return { index, width, height };
  });
}
