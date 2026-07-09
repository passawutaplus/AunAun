import type { MockupPresetId, MockupQuickPresetId } from "@/lib/labs/types";

export type MockupSettings = {
  preset: MockupPresetId;
  background: string;
  padding: number;
  shadow: number;
  radius: number;
  deviceColor: string;
  caption: string;
  showLogo: boolean;
  exportWidth: number;
  exportFormat: "png" | "jpg" | "webp";
  exportQuality: number;
};

export const MOCKUP_PRESETS: { id: MockupPresetId; label: string }[] = [
  { id: "browser", label: "Browser" },
  { id: "desktop", label: "Desktop" },
  { id: "mobile", label: "Mobile" },
  { id: "tablet", label: "Tablet" },
  { id: "social", label: "Social" },
  { id: "beforeAfter", label: "Before/After" },
];

export const QUICK_PRESETS: {
  id: MockupQuickPresetId;
  label: string;
  settings: Partial<MockupSettings>;
}[] = [
  {
    id: "clientPresentation",
    label: "นำเสนอลูกค้า",
    settings: { preset: "browser", padding: 48, shadow: 24, background: "#f4f4f5" },
  },
  {
    id: "portfolioCaseStudy",
    label: "Portfolio",
    settings: { preset: "desktop", padding: 64, shadow: 32, background: "#18181b", caption: "" },
  },
  {
    id: "socialPreview",
    label: "Social",
    settings: { preset: "social", padding: 32, shadow: 16, background: "#ffffff" },
  },
  {
    id: "beforeAfter",
    label: "Before/After",
    settings: { preset: "beforeAfter", padding: 40, shadow: 20, background: "#fafafa" },
  },
];

export const DEFAULT_MOCKUP_SETTINGS: MockupSettings = {
  preset: "browser",
  background: "#f4f4f5",
  padding: 40,
  shadow: 20,
  radius: 12,
  deviceColor: "#27272a",
  caption: "",
  showLogo: false,
  exportWidth: 1600,
  exportFormat: "png",
  exportQuality: 0.92,
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export async function renderMockupCanvas(opts: {
  image?: HTMLImageElement | null;
  imageBefore?: HTMLImageElement | null;
  imageAfter?: HTMLImageElement | null;
  settings: MockupSettings;
  logo?: HTMLImageElement | null;
}): Promise<HTMLCanvasElement> {
  const { settings } = opts;
  const exportW = settings.exportWidth;
  const ratio = settings.preset === "social" ? 1 : settings.preset === "mobile" ? 9 / 16 : 16 / 10;
  const exportH = Math.round(exportW / (settings.preset === "beforeAfter" ? 2.2 : ratio) + 120);

  const canvas = document.createElement("canvas");
  canvas.width = exportW;
  canvas.height = exportH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = settings.background;
  ctx.fillRect(0, 0, exportW, exportH);

  const pad = settings.padding;
  const frameW = exportW - pad * 2;
  const frameH = exportH - pad * 2 - (settings.caption ? 40 : 0);

  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${settings.shadow / 100})`;
  ctx.shadowBlur = settings.shadow;
  ctx.shadowOffsetY = settings.shadow / 4;

  if (settings.preset === "beforeAfter" && opts.imageBefore && opts.imageAfter) {
    const half = (frameW - 16) / 2;
    drawDeviceFrame(ctx, pad, pad, half, frameH, settings, opts.imageBefore, "ก่อน");
    drawDeviceFrame(ctx, pad + half + 16, pad, half, frameH, settings, opts.imageAfter, "หลัง");
  } else if (opts.image) {
    drawDeviceFrame(ctx, pad, pad, frameW, frameH, settings, opts.image);
  } else {
    ctx.fillStyle = settings.deviceColor;
    roundRect(ctx, pad, pad, frameW, frameH, settings.radius);
    ctx.fill();
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("อัปโหลดภาพหรือวาง URL", exportW / 2, exportH / 2);
  }

  ctx.restore();

  if (settings.caption) {
    ctx.fillStyle = "#52525b";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(settings.caption, exportW / 2, exportH - 24);
  }

  if (settings.showLogo && opts.logo) {
    const lw = 48;
    const lh = 48;
    ctx.drawImage(opts.logo, exportW - pad - lw, pad, lw, lh);
  }

  return canvas;
}

function drawDeviceFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  settings: MockupSettings,
  img: HTMLImageElement,
  label?: string,
) {
  if (settings.preset === "browser") {
    const barH = 28;
    ctx.fillStyle = settings.deviceColor;
    roundRect(ctx, x, y, w, h, settings.radius);
    ctx.fill();
    ctx.fillStyle = "#3f3f46";
    ctx.fillRect(x, y + barH, w, h - barH);
    ctx.fillStyle = "#71717a";
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(x + 14 + i * 14, y + barH / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    drawImageCover(ctx, img, x + 8, y + barH + 8, w - 16, h - barH - 16, settings.radius);
  } else {
    ctx.fillStyle = settings.deviceColor;
    roundRect(ctx, x, y, w, h, settings.radius);
    ctx.fill();
    const inset = settings.preset === "mobile" ? 12 : 8;
    drawImageCover(ctx, img, x + inset, y + inset, w - inset * 2, h - inset * 2, settings.radius - 4);
  }

  if (label) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(label, x + 8, y + 18);
  }
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

export function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("โหลดภาพไม่สำเร็จ"));
    img.src = src;
  });
}

export async function exportMockupCanvas(
  canvas: HTMLCanvasElement,
  format: "png" | "jpg" | "webp",
  quality: number,
): Promise<Blob> {
  const mime =
    format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("ส่งออกไม่สำเร็จ"))),
      mime,
      format === "png" ? undefined : quality,
    );
  });
}
