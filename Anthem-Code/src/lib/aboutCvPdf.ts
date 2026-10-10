const A4_PT_W = 595.28;
const A4_PT_H = 841.89;

export function aboutCvPdfFilename(fullName: string): string {
  const base =
    fullName
      .trim()
      .replace(/\.pdf$/i, "")
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "about-me";
  return `${base}.pdf`;
}

function jpegSize(bytes: Uint8Array): { width: number; height: number } {
  let i = 2;
  while (i < bytes.length - 8) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];
    const len = (bytes[i + 2] << 8) + bytes[i + 3];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return {
        height: (bytes[i + 5] << 8) + bytes[i + 6],
        width: (bytes[i + 7] << 8) + bytes[i + 8],
      };
    }
    i += 2 + len;
  }
  return { width: 1, height: 1 };
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const data = dataUrl.split(",")[1] ?? "";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const part of parts) {
    out.set(part, o);
    o += part.length;
  }
  return out;
}

/** One-page A4 PDF with a JPEG stretched to the page. */
export function jpegDataUrlToA4Pdf(dataUrl: string): Blob {
  const jpeg = dataUrlToBytes(dataUrl);
  const { width, height } = jpegSize(jpeg);
  const enc = new TextEncoder();
  const content = `q ${A4_PT_W} 0 0 ${A4_PT_H} 0 0 cm /Im0 Do Q\n`;

  const objs = [
    enc.encode("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    enc.encode("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    enc.encode(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_PT_W} ${A4_PT_H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    ),
    concat([
      enc.encode(
        `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      ),
      jpeg,
      enc.encode("\nendstream\nendobj\n"),
    ]),
    enc.encode(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`),
  ];

  const header = enc.encode("%PDF-1.4\n");
  const offsets = [0];
  let pos = header.length;
  for (const obj of objs) {
    offsets.push(pos);
    pos += obj.length;
  }
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const xrefBytes = enc.encode(xref);
  const trailer = enc.encode(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`);
  return new Blob([concat([header, ...objs, xrefBytes, trailer])], { type: "application/pdf" });
}

export async function downloadAboutCvPdf(filename: string): Promise<void> {
  // The print sheet is fixed at A4 and already carries the chosen theme, density and contacts.
  const sheet =
    (document.querySelector("#about-cv-print .about-cv-sheet") as HTMLElement | null) ??
    (document.querySelector(".about-cv-a4-frame .about-cv-sheet") as HTMLElement | null);
  if (!sheet) throw new Error("ไม่พบเอกสารพรีวิว");

  const { toJpeg } = await import("html-to-image");
  const dataUrl = await toJpeg(sheet, {
    cacheBust: true,
    pixelRatio: 2,
    quality: 0.92,
    skipFonts: true,
    backgroundColor: "#ffffff",
  });
  const blob = jpegDataUrlToA4Pdf(dataUrl);
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  a.click();
  URL.revokeObjectURL(href);
}
