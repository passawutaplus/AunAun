import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { computePhash, hammingDistance } from "./phash";

async function gradient(width: number, height: number, invert = false): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = Math.round(((x + y) / (width + height)) * 255);
      const p = (y * width + x) * 3;
      const val = invert ? 255 - v : v;
      raw[p] = val;
      raw[p + 1] = (val * 3) % 256;
      raw[p + 2] = (x * 7) % 256;
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

test("hash is 64 bits", async () => {
  const h = await computePhash(await gradient(200, 150));
  assert.match(h, /^[01]{64}$/);
});

test("resized copy is a near duplicate", async () => {
  const original = await gradient(400, 300);
  const smaller = await sharp(original).resize(160, 120).jpeg({ quality: 70 }).toBuffer();
  const d = hammingDistance(await computePhash(original), await computePhash(smaller));
  assert.ok(d <= 6, `distance ${d}`);
});

test("different image is far apart", async () => {
  const a = await computePhash(await gradient(400, 300));
  const b = await computePhash(await gradient(400, 300, true));
  assert.ok(hammingDistance(a, b) > 6);
});
