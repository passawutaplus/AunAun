import sharp from "sharp";

import { phashFromGray as sharedPhashFromGray } from "../../../lib/engine/phash.mjs";

const SIZE = 32;

/** DCT perceptual hash as a 64-char bit string. The algorithm lives in lib/engine/phash.mjs (shared with user-item enrichment). */
export function phashFromGray(pixels: Uint8Array | Buffer): string {
  return sharedPhashFromGray(pixels);
}

export async function computePhash(image: Buffer): Promise<string> {
  const pixels = await sharp(image)
    .rotate()
    .greyscale()
    .resize(SIZE, SIZE, { fit: "fill" })
    .raw()
    .toBuffer();
  return phashFromGray(pixels);
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) throw new Error("Hash length mismatch");
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}
