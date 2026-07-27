/** Client-side AI image validation for KYC uploads (blur / light / corners / glare / card-like). */

export type KycQualityCheckId =
  | "real_card"
  | "clear"
  | "lighting"
  | "four_corners"
  | "not_blurry"
  | "no_glare"
  | "face_centered"
  | "face_lighting"
  | "face_sharp"
  | "face_alone";

export type KycQualityCheck = {
  id: KycQualityCheckId;
  label: string;
  pass: boolean;
  score: number; // 0–100
  detail?: string;
};

export type KycQualityResult = {
  passed: boolean;
  checks: KycQualityCheck[];
  message: string;
};

export const KYC_QUALITY_LABELS: Record<KycQualityCheckId, string> = {
  real_card: "บัตรจริงหรือไม่",
  clear: "รูปชัดหรือไม่",
  lighting: "แสงพอหรือไม่",
  four_corners: "ครบทั้ง 4 มุม",
  not_blurry: "ไม่เบลอ",
  no_glare: "ไม่สะท้อนแสง",
  face_centered: "หน้าอยู่ตรงกลาง",
  face_lighting: "แสง",
  face_sharp: "ชัด",
  face_alone: "ไม่มีคนอื่น",
};

const RETAKE_MSG = "กรุณาถ่ายใหม่";

type GrayStats = {
  width: number;
  height: number;
  gray: Float32Array;
  mean: number;
  std: number;
};

async function loadImageToCanvas(
  source: File | Blob,
  maxSide = 640,
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  const url = URL.createObjectURL(source);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("โหลดรูปไม่สำเร็จ"));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(32, Math.round(img.width * scale));
    const h = Math.max(32, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("ไม่รองรับการวิเคราะห์รูป");
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, ctx };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toGrayStats(ctx: CanvasRenderingContext2D, w: number, h: number): GrayStats {
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
    gray[p] = g;
    sum += g;
  }
  const mean = sum / gray.length;
  let varSum = 0;
  for (let i = 0; i < gray.length; i++) {
    const d = gray[i]! - mean;
    varSum += d * d;
  }
  return { width: w, height: h, gray, mean, std: Math.sqrt(varSum / gray.length) };
}

/** Laplacian variance — higher = sharper. */
export function laplacianVariance(gray: Float32Array, w: number, h: number): number {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        -4 * gray[i]! +
        gray[i - 1]! +
        gray[i + 1]! +
        gray[i - w]! +
        gray[i + w]!;
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

function isSkinTone(r: number, g: number, b: number): boolean {
  // Loose YCbCr-ish skin heuristic for center-face detection
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return y > 40 && y < 240 && cb > 77 && cb < 140 && cr > 125 && cr < 180;
}

/** Skin-tone mass in center oval vs edges — proxy for face centered + alone. */
export function analyzeFaceRegions(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): { centerRatio: number; edgeRatio: number; skinClusters: number } {
  const { data } = ctx.getImageData(0, 0, w, h);
  const cx = w / 2;
  const cy = h * 0.42;
  const rx = w * 0.28;
  const ry = h * 0.34;
  let centerSkin = 0;
  let centerTotal = 0;
  let edgeSkin = 0;
  let edgeTotal = 0;
  const grid = 8;
  const cellSkin = new Array(grid * grid).fill(0);
  const cellTotal = new Array(grid * grid).fill(0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const skin = isSkinTone(data[i]!, data[i + 1]!, data[i + 2]!);
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const inOval = nx * nx + ny * ny <= 1;
      if (inOval) {
        centerTotal++;
        if (skin) centerSkin++;
      } else {
        edgeTotal++;
        if (skin) edgeSkin++;
      }
      const gx = Math.min(grid - 1, Math.floor((x / w) * grid));
      const gy = Math.min(grid - 1, Math.floor((y / h) * grid));
      const gi = gy * grid + gx;
      cellTotal[gi]!++;
      if (skin) cellSkin[gi]!++;
    }
  }

  let skinClusters = 0;
  for (let i = 0; i < cellSkin.length; i++) {
    if (cellTotal[i]! > 20 && cellSkin[i]! / cellTotal[i]! > 0.22) skinClusters++;
  }

  return {
    centerRatio: centerTotal ? centerSkin / centerTotal : 0,
    edgeRatio: edgeTotal ? edgeSkin / edgeTotal : 0,
    skinClusters,
  };
}

type FaceDetectorLike = {
  detect: (image: ImageBitmapSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

async function detectFacesWithApi(
  canvas: HTMLCanvasElement,
): Promise<{ count: number; centered: boolean } | null> {
  const FD = (window as unknown as { FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike })
    .FaceDetector;
  if (!FD) return null;
  try {
    const detector = new FD({ fastMode: true, maxDetectedFaces: 4 });
    const faces = await detector.detect(canvas);
    if (!faces.length) return { count: 0, centered: false };
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h * 0.42;
    let centered = false;
    for (const f of faces) {
      const box = f.boundingBox;
      const fx = box.x + box.width / 2;
      const fy = box.y + box.height / 2;
      const dx = Math.abs(fx - cx) / w;
      const dy = Math.abs(fy - cy) / h;
      if (dx < 0.18 && dy < 0.22 && box.width > w * 0.18) centered = true;
    }
    return { count: faces.length, centered };
  } catch {
    return null;
  }
}

export function evaluateSelfieQuality(
  stats: GrayStats,
  face: { centerRatio: number; edgeRatio: number; skinClusters: number },
  apiFaces: { count: number; centered: boolean } | null,
): KycQualityResult {
  const { gray, width: w, height: h, mean, std } = stats;
  const blurVar = laplacianVariance(gray, w, h);

  const centered =
    apiFaces != null
      ? apiFaces.centered && apiFaces.count >= 1
      : face.centerRatio >= 0.12 && face.centerRatio > face.edgeRatio * 1.15;

  const lightingOk = mean >= 60 && mean <= 200;
  const sharpOk = blurVar >= 35 && std >= 14;
  const alone =
    apiFaces != null ? apiFaces.count <= 1 && apiFaces.count >= 1 : face.skinClusters <= 5 && face.centerRatio >= 0.08;

  const checks: KycQualityCheck[] = [
    {
      id: "face_centered",
      label: KYC_QUALITY_LABELS.face_centered,
      pass: centered,
      score: centered ? 85 : Math.round(Math.min(70, face.centerRatio * 400)),
      detail: centered ? undefined : "ขยับใบหน้าให้อยู่กลางเฟรม",
    },
    {
      id: "face_lighting",
      label: KYC_QUALITY_LABELS.face_lighting,
      pass: lightingOk,
      score: lightingOk ? 90 : scoreFromThreshold(mean, 60, 130, true),
      detail: mean < 60 ? "มืดเกินไป" : mean > 200 ? "สว่างจ้าเกินไป" : undefined,
    },
    {
      id: "face_sharp",
      label: KYC_QUALITY_LABELS.face_sharp,
      pass: sharpOk,
      score: scoreFromThreshold(blurVar, 35, 100, true),
      detail: sharpOk ? undefined : "ภาพเบลอ — ถือนิ่งแล้วถ่ายใหม่",
    },
    {
      id: "face_alone",
      label: KYC_QUALITY_LABELS.face_alone,
      pass: alone,
      score: alone ? 90 : 30,
      detail: alone ? undefined : "ตรวจพบหลายคนในภาพ",
    },
  ];

  const passed = checks.every((c) => c.pass);
  return {
    passed,
    checks,
    message: passed ? "ผ่านการตรวจใบหน้า" : RETAKE_MSG,
  };
}

function regionEdgeScore(gray: Float32Array, w: number, h: number, x0: number, y0: number, x1: number, y1: number): number {
  let sum = 0;
  let n = 0;
  const xs = Math.max(1, Math.floor(x0));
  const ys = Math.max(1, Math.floor(y0));
  const xe = Math.min(w - 2, Math.floor(x1));
  const ye = Math.min(h - 2, Math.floor(y1));
  for (let y = ys; y <= ye; y++) {
    for (let x = xs; x <= xe; x++) {
      const i = y * w + x;
      const gx = Math.abs(gray[i + 1]! - gray[i - 1]!);
      const gy = Math.abs(gray[i + w]! - gray[i - w]!);
      sum += gx + gy;
      n++;
    }
  }
  return n ? sum / n : 0;
}

function glareRatio(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const { data } = ctx.getImageData(0, 0, w, h);
  let hot = 0;
  const total = w * h;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // Near-white specular highlight
    if (max >= 245 && max - min <= 18) hot++;
  }
  return hot / total;
}

function scoreFromThreshold(value: number, passAt: number, goodAt: number, higherIsBetter: boolean): number {
  if (higherIsBetter) {
    if (value >= goodAt) return 100;
    if (value <= passAt * 0.5) return 0;
    if (value >= passAt) return 60 + 40 * Math.min(1, (value - passAt) / Math.max(1, goodAt - passAt));
    return 40 * (value / passAt);
  }
  // lower is better (glare)
  if (value <= goodAt) return 100;
  if (value >= passAt * 2) return 0;
  if (value <= passAt) return 60 + 40 * (1 - (value - goodAt) / Math.max(0.001, passAt - goodAt));
  return Math.max(0, 40 * (1 - (value - passAt) / passAt));
}

export type KycQualityDocKind = "id_card" | "selfie" | "bank_book";

export function evaluateQualityFromStats(
  stats: GrayStats,
  glare: number,
  kind: KycQualityDocKind,
): KycQualityResult {
  // Selfie uses evaluateSelfieQuality via analyzeKycImageQuality
  if (kind === "selfie") {
    return {
      passed: false,
      checks: [],
      message: RETAKE_MSG,
    };
  }

  const { width: w, height: h, gray, mean, std } = stats;
  const blurVar = laplacianVariance(gray, w, h);
  const aspect = w / h;

  const cornerPadX = w * 0.18;
  const cornerPadY = h * 0.18;
  const corners = [
    regionEdgeScore(gray, w, h, 0, 0, cornerPadX, cornerPadY),
    regionEdgeScore(gray, w, h, w - cornerPadX, 0, w, cornerPadY),
    regionEdgeScore(gray, w, h, 0, h - cornerPadY, cornerPadX, h),
    regionEdgeScore(gray, w, h, w - cornerPadX, h - cornerPadY, w, h),
  ];
  const cornersOk = corners.filter((c) => c >= 12).length;
  const cornerAvg = corners.reduce((a, b) => a + b, 0) / 4;

  const idAspectOk = aspect >= 1.25 && aspect <= 1.95;
  const textureOk = std >= 18;
  const realPass = idAspectOk && textureOk && cornerAvg >= 10;

  const blurPassAt = 45;
  const blurGoodAt = 120;
  const notBlurry = blurVar >= blurPassAt;
  const lightingOk = mean >= 55 && mean <= 210;
  const clearOk = notBlurry && std >= 16;
  const fourCorners = cornersOk >= 3;
  const noGlare = glare <= 0.045;

  const checks: KycQualityCheck[] = [
    {
      id: "real_card",
      label: KYC_QUALITY_LABELS.real_card,
      pass: realPass,
      score: scoreFromThreshold((realPass ? 70 : 30) + (textureOk ? 15 : 0) + (idAspectOk ? 15 : 0), 50, 90, true),
      detail: realPass ? undefined : "ไม่พบลักษณะเอกสารที่ชัด",
    },
    {
      id: "clear",
      label: KYC_QUALITY_LABELS.clear,
      pass: clearOk,
      score: scoreFromThreshold(std + Math.min(40, blurVar / 4), 30, 70, true),
    },
    {
      id: "lighting",
      label: KYC_QUALITY_LABELS.lighting,
      pass: lightingOk,
      score: lightingOk ? scoreFromThreshold(100 - Math.abs(mean - 130) / 1.3, 50, 90, true) : scoreFromThreshold(mean, 55, 130, true),
      detail: mean < 55 ? "มืดเกินไป" : mean > 210 ? "สว่างจ้าเกินไป" : undefined,
    },
    {
      id: "four_corners",
      label: KYC_QUALITY_LABELS.four_corners,
      pass: fourCorners,
      score: Math.round((cornersOk / 4) * 100),
      detail: fourCorners ? undefined : `เห็นชัด ${cornersOk}/4 มุม`,
    },
    {
      id: "not_blurry",
      label: KYC_QUALITY_LABELS.not_blurry,
      pass: notBlurry,
      score: scoreFromThreshold(blurVar, blurPassAt, blurGoodAt, true),
    },
    {
      id: "no_glare",
      label: KYC_QUALITY_LABELS.no_glare,
      pass: noGlare,
      score: scoreFromThreshold(glare, 0.045, 0.015, false),
      detail: noGlare ? undefined : "มีแสงสะท้อนบังข้อมูล",
    },
  ];

  const passed = checks.every((c) => c.pass);
  return {
    passed,
    checks,
    message: passed ? "ผ่านการตรวจคุณภาพรูป" : RETAKE_MSG,
  };
}

const DOC_CHECK_IDS: KycQualityCheckId[] = [
  "real_card",
  "clear",
  "lighting",
  "four_corners",
  "not_blurry",
  "no_glare",
];

export async function analyzeKycImageQuality(
  source: File | Blob,
  kind: KycQualityDocKind = "id_card",
): Promise<KycQualityResult> {
  if (typeof document === "undefined") {
    return {
      passed: true,
      checks: [],
      message: "ข้ามตรวจคุณภาพ (server)",
    };
  }
  const mime = "type" in source ? source.type : "";
  if (mime === "application/pdf" || ("name" in source && String(source.name).toLowerCase().endsWith(".pdf"))) {
    return {
      passed: true,
      checks: DOC_CHECK_IDS.map((id) => ({
        id,
        label: KYC_QUALITY_LABELS[id],
        pass: true,
        score: 70,
        detail: "ไฟล์ PDF — แอดมินจะตรวจคุณภาพอีกครั้ง",
      })),
      message: "รับไฟล์ PDF แล้ว (ตรวจคุณภาพเต็มรูปแบบเมื่อเป็นรูปภาพ)",
    };
  }

  const { canvas, ctx } = await loadImageToCanvas(source);
  const stats = toGrayStats(ctx, canvas.width, canvas.height);

  if (kind === "selfie") {
    const face = analyzeFaceRegions(ctx, canvas.width, canvas.height);
    const apiFaces = await detectFacesWithApi(canvas);
    return evaluateSelfieQuality(stats, face, apiFaces);
  }

  const glare = glareRatio(ctx, canvas.width, canvas.height);
  return evaluateQualityFromStats(stats, glare, kind);
}
