import { toast } from "sonner";

export type PrintBodyClass =
  | "printing-mockup"
  | "printing-brief"
  | "printing-track"
  | "printing-meeting-report";

const PRINT_HINT_IOS =
  "บน iPhone/iPad: ในกล่องพิมพ์ให้เลือก «บันทึกเป็น PDF» แล้วกดบันทึก — ไม่ใช่ส่งไปเครื่องพิมพ์จริง";

const PRINT_HINT_ANDROID = "ในกล่องพิมพ์ ให้เลือก «บันทึกเป็น PDF» หรือเป้าหมาย PDF";

export function getPrintPdfPlatformHint(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return PRINT_HINT_IOS;
  if (/Android/i.test(ua)) return PRINT_HINT_ANDROID;
  return "ในหน้าต่างพิมพ์ เลือก «บันทึกเป็น PDF» หรือ «Save as PDF»";
}

function detectMobileUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
}

/** Strip zoom/transform on images inside a subtree before print / canvas capture. */
export function preparePrintImages(root: HTMLElement | null) {
  if (!root) return () => {};
  const imgs = root.querySelectorAll("img");
  const prev: Array<{ el: HTMLImageElement; crossOrigin: string | null }> = [];
  imgs.forEach((img) => {
    prev.push({ el: img, crossOrigin: img.crossOrigin });
    if (!img.crossOrigin) img.crossOrigin = "anonymous";
  });
  return () => {
    prev.forEach(({ el, crossOrigin }) => {
      if (crossOrigin === null) el.removeAttribute("crossorigin");
      else el.crossOrigin = crossOrigin;
    });
  };
}

export type RunPrintToPdfOptions = {
  bodyClass: PrintBodyClass;
  /** CSS selector for print payload root — must exist in DOM before printing. */
  printRootSelector?: string;
  /** Delay before window.print() — Safari/iOS needs more time after DOM updates. */
  delayMs?: number;
  onAfterPrint?: () => void;
  onCancel?: () => void;
  successMessage?: string;
  errorMessage?: string;
  /** Show platform hint toast before opening print dialog. */
  showHint?: boolean;
};

const DEFAULT_MOCKUP_PRINT_SELECTOR = ".mockup-print-only .mockup-print-root";

/** Returns true when the off-screen print portal is mounted and has content. */
export function isPrintRootReady(selector = DEFAULT_MOCKUP_PRINT_SELECTOR): boolean {
  if (typeof document === "undefined") return false;
  const root = document.querySelector(selector);
  if (!(root instanceof HTMLElement)) return false;
  return root.getBoundingClientRect().height > 0 || root.childElementCount > 0;
}

/** Wait until print portal is in the DOM (portal + layout). */
export function waitForPrintRoot(
  selector = DEFAULT_MOCKUP_PRINT_SELECTOR,
  timeoutMs = 5000,
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const el = document.querySelector(selector);
      if (
        el instanceof HTMLElement &&
        (el.getBoundingClientRect().height > 0 || el.childElementCount > 0)
      ) {
        resolve(el);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error("เนื้อหา PDF ยังไม่พร้อม — ลองอีกครั้งในไม่กี่วินาที"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/**
 * Opens the browser print dialog (user saves as PDF).
 * Uses body class + @media print CSS; call after print payload is in the DOM.
 */
export function runPrintToPdf({
  bodyClass,
  printRootSelector = DEFAULT_MOCKUP_PRINT_SELECTOR,
  delayMs,
  onAfterPrint,
  onCancel,
  successMessage = "เปิดหน้าต่างพิมพ์แล้ว — เลือกบันทึกเป็น PDF",
  errorMessage = "พิมพ์ PDF ไม่สำเร็จ",
  showHint = true,
}: RunPrintToPdfOptions): void {
  if (typeof window === "undefined") return;

  void (async () => {
    const hint = showHint ? getPrintPdfPlatformHint() : undefined;
    if (hint) {
      toast.info(hint, { duration: 6000 });
    }

    let restoreImages = () => {};
    try {
      const root = await waitForPrintRoot(printRootSelector);
      restoreImages = preparePrintImages(root);
    } catch (err) {
      toast.error(errorMessage, {
        description: err instanceof Error ? err.message : "เนื้อหา PDF ยังไม่พร้อม",
      });
      onCancel?.();
      return;
    }

    document.body.classList.add(bodyClass);
    let completed = false;

    const cleanup = () => {
      restoreImages();
      document.body.classList.remove(bodyClass);
      window.removeEventListener("afterprint", onAfter);
    };

    const onAfter = () => {
      if (completed) return;
      completed = true;
      cleanup();
      toast.success(successMessage);
      onAfterPrint?.();
    };

    window.addEventListener("afterprint", onAfter);

    const wait = delayMs ?? (detectMobileUa() ? 500 : 280);

    window.setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        completed = true;
        cleanup();
        toast.error(errorMessage, {
          description: err instanceof Error ? err.message : "เบราว์เซอร์ไม่ตอบสนอง",
        });
        onCancel?.();
        return;
      }
      window.setTimeout(() => {
        if (!completed) {
          cleanup();
          onCancel?.();
        }
      }, 120_000);
    }, wait);
  })();
}

/** Multi-page A4 PDF via html2canvas + jsPDF (for long reports). */
export async function exportElementToPdfA4(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const restoreImages = preparePrintImages(element);

  try {
    const canvas = await html2canvas(element, {
      scale: Math.min(2, window.devicePixelRatio > 1 ? 2 : 1.5),
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      allowTaint: false,
      onclone: (doc, clone) => {
        const root = clone.querySelector("[data-pdf-export-root]") ?? doc.body;
        if (root instanceof HTMLElement) {
          root.style.transform = "none";
          root.style.maxHeight = "none";
          root.style.overflow = "visible";
        }
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const contentW = pageW - margin * 2;
    const contentH = pageH - margin * 2;

    const imgWidth = contentW;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= contentH;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= contentH;
    }

    pdf.save(filename);
  } finally {
    restoreImages();
  }
}

/** Same as exportElementToPdfA4 but returns a Blob for ZIP bundling. */
export async function exportElementToPdfBlob(element: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const restoreImages = preparePrintImages(element);

  try {
    const canvas = await html2canvas(element, {
      scale: Math.min(2, window.devicePixelRatio > 1 ? 2 : 1.5),
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      allowTaint: false,
      onclone: (doc, clone) => {
        const root = clone.querySelector("[data-pdf-export-root]") ?? doc.body;
        if (root instanceof HTMLElement) {
          root.style.transform = "none";
          root.style.maxHeight = "none";
          root.style.overflow = "visible";
        }
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const contentW = pageW - margin * 2;
    const contentH = pageH - margin * 2;

    const imgWidth = contentW;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= contentH;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= contentH;
    }

    return pdf.output("blob");
  } finally {
    restoreImages();
  }
}
