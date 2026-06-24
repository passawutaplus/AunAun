const OKLCH_RE = /oklch\([^)]*(?:\/[^)]*)?\)/gi;

let colorProbe: HTMLDivElement | null = null;

function getColorProbe(): HTMLDivElement {
  if (!colorProbe) {
    colorProbe = document.createElement("div");
    colorProbe.style.display = "none";
    document.body.appendChild(colorProbe);
  }
  return colorProbe;
}

/** Let the browser resolve oklch (and other modern CSS colors) to rgb(). */
function cssColorToRgb(value: string, property: "color" | "background" = "color"): string {
  const probe = getColorProbe();
  if (property === "background") {
    probe.style.background = "";
    probe.style.background = value;
    return getComputedStyle(probe).background || value;
  }
  probe.style.color = "";
  probe.style.color = value;
  return getComputedStyle(probe).color || "rgb(128, 128, 128)";
}

function sanitizeCssText(css: string): string {
  return css.replace(OKLCH_RE, (match) => cssColorToRgb(match));
}

const INLINE_PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "boxShadow",
  "background",
  "backgroundImage",
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "fill",
  "stroke",
] as const;

function inlineComputedStyles(source: Element, target: Element) {
  if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) return;

  const computed = getComputedStyle(source);
  for (const prop of INLINE_PROPS) {
    const value = computed[prop];
    if (!value || value === "none" || value === "normal") continue;
    const safe = value.includes("oklch") ? sanitizeCssText(value) : value;
    (target.style as unknown as Record<string, string>)[prop] = safe;
  }

  const len = Math.min(source.children.length, target.children.length);
  for (let i = 0; i < len; i++) {
    inlineComputedStyles(source.children[i], target.children[i]);
  }
}

function sanitizeClonedStyles(clonedDoc: Document) {
  clonedDoc.querySelectorAll("style").forEach((node) => {
    if (node.textContent) node.textContent = sanitizeCssText(node.textContent);
  });
}

type CaptureOptions = {
  ignoreSelector?: string;
};

export async function capturePageScreenshot(options: CaptureOptions = {}): Promise<Blob> {
  const { default: html2canvas } = await import("html2canvas");
  const source = document.body;

  const canvas = await html2canvas(source, {
    useCORS: true,
    logging: false,
    scale: Math.min(2, window.devicePixelRatio || 1),
    ignoreElements: (el) => !!options.ignoreSelector && !!el.closest?.(options.ignoreSelector),
    onclone: (clonedDoc, clonedElement) => {
      sanitizeClonedStyles(clonedDoc);
      inlineComputedStyles(source, clonedElement);
    },
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88),
  );
  if (!blob) throw new Error("จับภาพไม่สำเร็จ");
  return blob;
}
