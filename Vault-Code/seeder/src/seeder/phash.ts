import sharp from "sharp";

const SIZE = 32;
const LOW = 8;

const cosTable: number[][] = Array.from({ length: LOW }, (_, u) =>
  Array.from({ length: SIZE }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * SIZE))),
);

/** DCT perceptual hash as a 64-char bit string (Postgres bit(64) literal). */
export function phashFromGray(pixels: Uint8Array | Buffer): string {
  if (pixels.length !== SIZE * SIZE) throw new Error(`Expected ${SIZE * SIZE} grayscale pixels`);

  const coeffs: number[] = [];
  for (let u = 0; u < LOW; u++) {
    for (let v = 0; v < LOW; v++) {
      let sum = 0;
      for (let y = 0; y < SIZE; y++) {
        const cy = cosTable[u][y];
        const row = y * SIZE;
        for (let x = 0; x < SIZE; x++) sum += pixels[row + x] * cy * cosTable[v][x];
      }
      coeffs.push(sum);
    }
  }

  // DC term dominates brightness; leave it out of the median.
  const median = [...coeffs.slice(1)].sort((a, b) => a - b)[Math.floor((coeffs.length - 1) / 2)];
  return coeffs.map((c) => (c > median ? "1" : "0")).join("");
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
