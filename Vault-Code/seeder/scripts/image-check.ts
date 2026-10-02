/**
 * Runs the image stages (download, quality, pHash, WebP, blurhash) on real source URLs. No DB, no AI.
 * Usage: npx tsx scripts/image-check.ts <imageUrl> [...more]
 */
import { DOWNLOAD_TIMEOUT_MS, MAX_DOWNLOAD_BYTES } from "../src/seeder/config";
import { fetchBuffer } from "../src/seeder/http";
import { computeBlurhash, passesQuality, readImageInfo, webpRenditions } from "../src/seeder/images";
import { computePhash } from "../src/seeder/phash";

async function check(url: string) {
  const started = Date.now();
  const image = await fetchBuffer(url, MAX_DOWNLOAD_BYTES, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
  const info = await readImageInfo(image);
  const [phash, blurhash, renditions] = await Promise.all([computePhash(image), computeBlurhash(image), webpRenditions(image)]);
  console.log({
    url,
    downloadedKb: Math.round(image.length / 1024),
    width: info.width,
    height: info.height,
    passesQuality: passesQuality(info),
    phash,
    blurhash,
    webpKb: Object.fromEntries(Object.entries(renditions).map(([k, v]) => [k, Math.round(v.length / 1024)])),
    ms: Date.now() - started,
  });
}

(async () => {
  for (const url of process.argv.slice(2)) await check(url);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
