import { encode } from "blurhash";
import sharp from "sharp";
import { MIN_LONG_EDGE_PX, RENDITION_WIDTHS, type RenditionSize } from "./config";

export type ImageInfo = { width: number; height: number; longEdge: number };

export async function readImageInfo(image: Buffer): Promise<ImageInfo> {
  const meta = await sharp(image).metadata();
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = (rotated ? meta.height : meta.width) ?? 0;
  const height = (rotated ? meta.width : meta.height) ?? 0;
  return { width, height, longEdge: Math.max(width, height) };
}

export function passesQuality(info: ImageInfo): boolean {
  return info.longEdge >= MIN_LONG_EDGE_PX;
}

/** JPEG sent to the vision model; long edge capped to keep token cost predictable. */
export async function visionJpeg(image: Buffer, longEdge = 1024): Promise<Buffer> {
  return sharp(image)
    .rotate()
    .resize(longEdge, longEdge, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82 })
    .toBuffer();
}

export async function webpRenditions(image: Buffer): Promise<Record<RenditionSize, Buffer>> {
  const entries = await Promise.all(
    (Object.keys(RENDITION_WIDTHS) as RenditionSize[]).map(async (size) => {
      const buf = await sharp(image)
        .rotate()
        .resize({ width: RENDITION_WIDTHS[size], withoutEnlargement: true })
        .webp({ quality: size === "lg" ? 74 : 78, effort: 4 })
        .toBuffer();
      return [size, buf] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<RenditionSize, Buffer>;
}

export async function computeBlurhash(image: Buffer): Promise<string> {
  const { data, info } = await sharp(image)
    .rotate()
    .resize(32, 32, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const xComponents = info.width >= info.height ? 4 : 3;
  const yComponents = info.width >= info.height ? 3 : 4;
  return encode(new Uint8ClampedArray(data), info.width, info.height, xComponents, yComponents);
}
