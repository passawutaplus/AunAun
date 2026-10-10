import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import type { AboutCvModel } from "@/lib/aboutCvModel";
import type { AboutCvTheme } from "@/lib/aboutCvTheme";
import { layoutAboutCv, type PdfFont, type PdfOp } from "@/lib/aboutCvPdfLayout";

const FONT_URLS: Record<PdfFont, string> = {
  r: "/fonts/Sarabun-Regular.ttf",
  b: "/fonts/Sarabun-Bold.ttf",
};

const PHOTO_PX = 480;
const PHOTO_RADIUS_RATIO = 0.07;

// The slice of the pdfkit API we touch (the package ships no browser types).
type PdfKitDoc = {
  on(event: "data", cb: (chunk: Uint8Array) => void): void;
  on(event: "end", cb: () => void): void;
  registerFont(name: string, src: ArrayBuffer): void;
  font(name: string): PdfKitDoc;
  fontSize(size: number): PdfKitDoc;
  fillColor(color: string): PdfKitDoc;
  strokeColor(color: string): PdfKitDoc;
  lineWidth(width: number): PdfKitDoc;
  widthOfString(text: string, options?: { characterSpacing?: number }): number;
  text(text: string, x: number, y: number, options?: { lineBreak?: boolean; characterSpacing?: number }): PdfKitDoc;
  rect(x: number, y: number, w: number, h: number): PdfKitDoc;
  roundedRect(x: number, y: number, w: number, h: number, r: number): PdfKitDoc;
  moveTo(x: number, y: number): PdfKitDoc;
  lineTo(x: number, y: number): PdfKitDoc;
  stroke(): PdfKitDoc;
  fill(color?: string): PdfKitDoc;
  path(d: string): PdfKitDoc;
  clip(): PdfKitDoc;
  save(): PdfKitDoc;
  restore(): PdfKitDoc;
  translate(x: number, y: number): PdfKitDoc;
  scale(x: number, y?: number): PdfKitDoc;
  image(src: ArrayBuffer, x: number, y: number, options?: { width?: number; height?: number }): PdfKitDoc;
  link(x: number, y: number, w: number, h: number, url: string): PdfKitDoc;
  addPage(): PdfKitDoc;
  end(): void;
};
type PdfKitCtor = new (options: Record<string, unknown>) => PdfKitDoc;

const fontCache = new Map<PdfFont, ArrayBuffer>();

async function loadFont(key: PdfFont): Promise<ArrayBuffer> {
  const hit = fontCache.get(key);
  if (hit) return hit;
  const res = await fetch(FONT_URLS[key]);
  if (!res.ok) throw new Error(`โหลดฟอนต์ไม่สำเร็จ (${res.status})`);
  const buf = await res.arrayBuffer();
  fontCache.set(key, buf);
  return buf;
}

/** Centre-cropped square JPEG of the portrait, or null when it cannot be read (e.g. no CORS). */
async function loadPortrait(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_PX;
    canvas.height = PHOTO_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PHOTO_PX, PHOTO_PX);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      PHOTO_PX,
      PHOTO_PX,
    );
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    // pdfkit only accepts Buffer/ArrayBuffer here; a Uint8Array is mistaken for a file path.
    return blob ? await blob.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Vector path + module count of a QR code, taken from the same generator the sheet uses. */
function qrVector(value: string): { d: string; cells: number } | null {
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(createElement(QRCodeSVG, { value, size: 96, level: "M", marginSize: 0 }));
    });
    const svg = host.querySelector("svg");
    const paths = svg?.querySelectorAll("path");
    const d = paths?.[paths.length - 1]?.getAttribute("d");
    const cells = Number(svg?.getAttribute("viewBox")?.split(/\s+/)[2]);
    return d && cells > 0 ? { d, cells } : null;
  } finally {
    root.unmount();
  }
}

export type TextPdfResult = { blob: Blob; photoSkipped: boolean };

/** Selectable-text A4 PDF (Sarabun, Thai-safe) built from the same model as the on-screen sheet. */
export async function buildAboutCvTextPdf(
  model: AboutCvModel,
  theme: AboutCvTheme,
  meta: { title: string },
): Promise<TextPdfResult> {
  const [kitModule, regular, bold] = await Promise.all([
    import("pdfkit/js/pdfkit.standalone.js"),
    loadFont("r"),
    loadFont("b"),
  ]);
  const PDFDocument = kitModule.default as unknown as PdfKitCtor;

  const wantsPhoto = model.showPhoto && !!model.portraitUrl;
  const photo = wantsPhoto && model.portraitUrl ? await loadPortrait(model.portraitUrl) : null;
  const qr = model.qrTarget ? qrVector(model.qrTarget) : null;

  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    compress: true,
    info: { Title: meta.title, Producer: "SAMECOR", Creator: "SAMECOR" },
  });
  doc.registerFont("r", regular);
  doc.registerFont("b", bold);

  const chunks: Uint8Array[] = [];
  doc.on("data", (c) => chunks.push(c));
  const finished = new Promise<void>((resolve) => doc.on("end", resolve));

  const measure = (text: string, font: PdfFont, size: number) => doc.font(font).fontSize(size).widthOfString(text);
  const layout = layoutAboutCv(model, measure, theme, !!photo);

  const paint = (op: PdfOp) => {
    switch (op.t) {
      case "text":
        doc
          .font(op.font)
          .fontSize(op.size)
          .fillColor(op.color)
          .text(op.text, op.x, op.y, { lineBreak: false, characterSpacing: op.spacing ?? 0 });
        break;
      case "rect":
        doc.rect(op.x, op.y, op.w, op.h).fill(op.color);
        break;
      case "line":
        doc.strokeColor(op.color).lineWidth(op.width).moveTo(op.x1, op.y).lineTo(op.x2, op.y).stroke();
        break;
      case "photo":
        if (!photo) break;
        doc.save();
        doc.roundedRect(op.x, op.y, op.size, op.size, op.size * PHOTO_RADIUS_RATIO).clip();
        doc.image(photo, op.x, op.y, { width: op.size, height: op.size });
        doc.restore();
        break;
      case "qr":
        if (!qr) break;
        doc.save();
        doc.translate(op.x, op.y);
        doc.scale(op.size / qr.cells);
        doc.path(qr.d).fill("#111111");
        doc.restore();
        break;
      case "link":
        doc.link(op.x, op.y, op.w, op.h, op.url);
        break;
    }
  };

  layout.pages.forEach((ops, i) => {
    if (i > 0) doc.addPage();
    ops.forEach(paint);
  });
  doc.end();
  await finished;

  return {
    blob: new Blob(chunks as BlobPart[], { type: "application/pdf" }),
    photoSkipped: wantsPhoto && !photo,
  };
}
