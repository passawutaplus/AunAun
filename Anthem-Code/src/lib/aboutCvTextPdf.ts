import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import type { AboutCvModel } from "@/lib/aboutCvModel";
import type { AboutCvTheme } from "@/lib/aboutCvTheme";
import type { CvHeadingFont } from "@/lib/profileCv";
import { layoutAboutCv, type PdfFont, type PdfOp } from "@/lib/aboutCvPdfLayout";

type FontFace = "body" | "bodyBold" | "agrandir" | "poppins";

/**
 * Body text is one loopless Thai face (IBM Plex Sans Thai, which also carries the Latin set).
 * If a file is missing the PDF falls back to Sarabun so downloads never break.
 */
const FONT_SOURCES: Record<FontFace, string[]> = {
  body: ["/fonts/IBMPlexSansThai-Regular.ttf", "/fonts/Sarabun-Regular.ttf"],
  bodyBold: ["/fonts/IBMPlexSansThai-Bold.ttf", "/fonts/Sarabun-Bold.ttf"],
  // Light TTF = the on-screen face (fontkit in the browser build cannot read WOFF2).
  agrandir: ["/fonts/Agrandir-Wide-Light.ttf", "/fonts/Agrandir-Wide.ttf"],
  poppins: ["/fonts/Poppins-SemiBold.ttf"],
};

const PHOTO_MAX_PX = 1100;
const THAI = /[฀-๿]/;

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
  image(
    src: ArrayBuffer,
    x: number,
    y: number,
    options?: { width?: number; height?: number; cover?: [number, number]; align?: string; valign?: string },
  ): PdfKitDoc;
  link(x: number, y: number, w: number, h: number, url: string): PdfKitDoc;
  addPage(): PdfKitDoc;
  end(): void;
};
type PdfKitCtor = new (options: Record<string, unknown>) => PdfKitDoc;

const fontCache = new Map<string, ArrayBuffer>();

/** TrueType/OpenType/WOFF signature — a SPA host answers a missing file with HTML and status 200. */
function looksLikeFont(buf: ArrayBuffer): boolean {
  const b = new Uint8Array(buf, 0, 4);
  const tag = String.fromCharCode(b[0], b[1], b[2], b[3]);
  return tag === "\u0000\u0001\u0000\u0000" || tag === "OTTO" || tag === "true" || tag === "wOFF";
}

async function loadFont(face: FontFace, optional = false): Promise<ArrayBuffer | null> {
  for (const url of FONT_SOURCES[face]) {
    const hit = fontCache.get(url);
    if (hit) return hit;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (!looksLikeFont(buf)) continue;
      fontCache.set(url, buf);
      return buf;
    } catch {
      /* try the next source */
    }
  }
  if (optional) return null;
  throw new Error("โหลดฟอนต์ไม่สำเร็จ");
}

/** JPEG of the whole portrait (aspect kept; the layout crops with `cover`), or null when unreadable (e.g. no CORS). */
async function loadPortrait(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const k = Math.min(1, PHOTO_MAX_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * k));
    canvas.height = Math.max(1, Math.round(bitmap.height * k));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
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

/** Which registered face draws this text. Thai never uses a Latin-only heading face. */
function pickFace(font: PdfFont, text: string, heading: CvHeadingFont, hasHeadingFace: boolean): string {
  if (font === "r") return "body";
  if (font === "b") return "bodyBold";
  if (THAI.test(text)) return "bodyBold";
  if ((heading === "agrandir" || heading === "poppins") && hasHeadingFace) return heading;
  return "bodyBold";
}

export type TextPdfResult = { blob: Blob; photoSkipped: boolean };

/** Selectable-text A4 PDF (loopless Thai body, chosen heading face) built from the same model as the on-screen sheet. */
export async function buildAboutCvTextPdf(
  model: AboutCvModel,
  theme: AboutCvTheme,
  meta: { title: string },
): Promise<TextPdfResult> {
  const headingKey = model.headingFont === "agrandir" || model.headingFont === "poppins" ? model.headingFont : null;
  const [kitModule, regular, bold, headingBuf] = await Promise.all([
    import("pdfkit/js/pdfkit.standalone.js"),
    loadFont("body"),
    loadFont("bodyBold"),
    headingKey ? loadFont(headingKey, true) : Promise.resolve(null),
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
  doc.registerFont("body", regular!);
  doc.registerFont("bodyBold", bold!);
  if (headingKey && headingBuf) doc.registerFont(headingKey, headingBuf);

  const chunks: Uint8Array[] = [];
  doc.on("data", (c) => chunks.push(c));
  const finished = new Promise<void>((resolve) => doc.on("end", resolve));

  const face = (font: PdfFont, text: string) => pickFace(font, text, model.headingFont, !!headingBuf);
  const measure = (text: string, font: PdfFont, size: number) =>
    doc.font(face(font, text)).fontSize(size).widthOfString(text);
  const layout = layoutAboutCv(model, measure, theme, !!photo);

  const paint = (op: PdfOp) => {
    switch (op.t) {
      case "text": {
        doc.font(face(op.font, op.text)).fontSize(op.size).fillColor(op.color);
        // Tracking would pull Thai marks off their base letters.
        const spacing = THAI.test(op.text) ? 0 : (op.spacing ?? 0);
        const x = op.align === "r" ? op.x - doc.widthOfString(op.text, { characterSpacing: spacing }) : op.x;
        doc.text(op.text, x, op.y, { lineBreak: false, characterSpacing: spacing });
        break;
      }
      case "rect":
        doc.rect(op.x, op.y, op.w, op.h).fill(op.color);
        break;
      case "line":
        doc.strokeColor(op.color).lineWidth(op.width).moveTo(op.x1, op.y).lineTo(op.x2, op.y).stroke();
        break;
      case "vline":
        doc.strokeColor(op.color).lineWidth(op.width).moveTo(op.x, op.y1).lineTo(op.x, op.y2).stroke();
        break;
      case "photo":
        if (!photo) break;
        doc.save();
        doc.rect(op.x, op.y, op.w, op.h).clip();
        doc.image(photo, op.x, op.y, { cover: [op.w, op.h], align: "center", valign: "center" });
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
