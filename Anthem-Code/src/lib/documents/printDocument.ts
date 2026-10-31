/**
 * Print / "Save as PDF" for any rendered document paper.
 *
 * Copies the app's stylesheets into a hidden iframe together with the paper's HTML, so the
 * printout looks exactly like the on-screen preview — A4, real margins, rows never split
 * across pages. The iframe title becomes the suggested PDF filename.
 */

const PRINT_CSS = `
@page { size: A4; margin: 14mm 12mm; }
html, body { background: #fff !important; margin: 0; padding: 0; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.print-root { max-width: 186mm; margin: 0 auto; }
.print-root > * { border: 0 !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
.print-root [data-print-hide] { display: none !important; }
.doc-row, .doc-totals, .doc-schedule, .doc-signatures { break-inside: avoid; page-break-inside: avoid; }
`;

/** Safe filename stem, e.g. "QT-2569-0001_ออกแบบโลโก้". */
export function documentFileStem(
  docNumber: string | null | undefined,
  title: string | null | undefined,
) {
  const clean = (s: string) =>
    s
      .replace(/[\\/:*?"<>|#%]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
  const parts = [docNumber, title].map((p) => clean(p || "")).filter(Boolean);
  return parts.join("_") || "เอกสาร";
}

function copyStyles(target: Document) {
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    target.head.appendChild(target.importNode(node, true));
  });
  const style = target.createElement("style");
  style.textContent = PRINT_CSS;
  target.head.appendChild(style);
}

/** Print the element (or element id). Resolves once the print dialog has been opened. */
export async function printDocumentElement(
  target: HTMLElement | string,
  fileStem: string,
) {
  const el =
    typeof target === "string" ? document.getElementById(target) : target;
  if (!el) return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(
    `<!doctype html><html lang="th"><head><meta charset="utf-8"><title></title></head><body></body></html>`,
  );
  doc.close();
  doc.title = fileStem;
  doc.documentElement.className = "light";
  copyStyles(doc);
  const root = doc.createElement("div");
  root.className = "print-root";
  root.appendChild(doc.importNode(el, true));
  doc.body.appendChild(root);

  // Wait for stylesheets + fonts so the PDF never renders in a fallback font.
  const links = Array.from(
    doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  );
  await Promise.all(
    links.map(
      (l) =>
        new Promise<void>((resolve) => {
          if (l.sheet) return resolve();
          l.addEventListener("load", () => resolve(), { once: true });
          l.addEventListener("error", () => resolve(), { once: true });
          window.setTimeout(resolve, 2500);
        }),
    ),
  );
  try {
    await doc.fonts?.ready;
  } catch {
    // ignore
  }

  // The parent title is what most browsers suggest as the PDF filename.
  const prevTitle = document.title;
  document.title = fileStem;
  let fallback = 0;
  const cleanup = () => {
    window.clearTimeout(fallback);
    if (!iframe.isConnected) return;
    document.title = prevTitle;
    iframe.remove();
  };
  win.addEventListener("afterprint", () => window.setTimeout(cleanup, 100), {
    once: true,
  });
  fallback = window.setTimeout(cleanup, 60_000);
  win.focus();
  win.print();
}
