/** Lazy PDF page thumbnails via pdfjs-dist (client-only). */

export async function renderPdfPageThumbnail(
  pdfBytes: Uint8Array,
  pageIndex: number,
  maxWidth = 72,
): Promise<string | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    const version = pdfjs.version ?? "4.10.38";
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

    const doc = await pdfjs.getDocument({ data: pdfBytes.slice() }).promise;
    const page = await doc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / viewport.width;
    const scaled = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(scaled.width);
    canvas.height = Math.floor(scaled.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport: scaled }).promise;
    return canvas.toDataURL("image/jpeg", 0.75);
  } catch {
    return null;
  }
}

export async function renderPdfPageThumbnails(
  pdfBytes: Uint8Array,
  pageCount: number,
  maxWidth = 72,
): Promise<(string | null)[]> {
  const thumbs: (string | null)[] = [];
  for (let i = 0; i < pageCount; i++) {
    thumbs.push(await renderPdfPageThumbnail(pdfBytes, i, maxWidth));
  }
  return thumbs;
}
