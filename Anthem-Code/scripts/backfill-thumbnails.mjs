#!/usr/bin/env node
/**
 * One-off: give every image in `project-media/anthem/` a small copy next to it, so cards and grids
 * stop downloading the full file (Supabase egress).
 *
 *   <file>            -> <file>.w640.webp   (cards, grids, feed)
 *   .../avatar/<file> -> <file>.w128.webp   (avatars in lists)
 *
 * Safe by design: it only ADDS files. Uploads use upsert:false, an existing small copy is skipped,
 * and nothing is ever deleted, moved or overwritten. Run it again any time — it only fills gaps.
 *
 * Usage (from Anthem-Code/):
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_KEY=<key> node scripts/backfill-thumbnails.mjs
 *       dry run: lists what is missing, changes nothing (the publishable key is enough)
 *   ... node scripts/backfill-thumbnails.mjs --sample 5
 *       also resizes 5 files in memory and prints before / after sizes; uploads nothing
 *   ... node scripts/backfill-thumbnails.mjs --write
 *       uploads the missing small copies (needs the service role key)
 *
 * Keep the naming in step with src/lib/mediaThumb.ts.
 */
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "project-media";
const ROOT = "anthem";
/** Not shown in cards or grids: private chat files and old identity documents. */
const SKIP_TOP_FOLDERS = new Set(["chat", "kyc"]);
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const THUMB_NAME = /\.w\d+\.webp$/i;
const CARD_WIDTH = 640;
const AVATAR_WIDTH = 128;
const QUALITY = 75;
const ONE_YEAR = "31536000";
const PAGE = 1000;
const PARALLEL = 4;

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const sampleAt = args.indexOf("--sample");
const SAMPLE = sampleAt >= 0 ? Number(args[sampleAt + 1] ?? 5) : 0;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_KEY (service role key for --write).");
  process.exit(1);
}
const storage = createClient(url, key, { auth: { persistSession: false } }).storage.from(BUCKET);

export function thumbWidthFor(path) {
  return /\/avatar\//.test(path) ? AVATAR_WIDTH : CARD_WIDTH;
}
export function thumbPathFor(path) {
  return `${path}.w${thumbWidthFor(path)}.webp`;
}

/** Every file under `prefix`, walking folders (a folder entry has no id). */
async function listAll(prefix, out = []) {
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await storage.list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) out.push({ path, size: Number(entry.metadata?.size ?? 0) });
      else if (!(prefix === ROOT && SKIP_TOP_FOLDERS.has(entry.name))) await listAll(path, out);
    }
    if ((data?.length ?? 0) < PAGE) return out;
  }
}

async function makeThumb(path) {
  const { data, error } = await storage.download(path);
  if (error) throw new Error(`download: ${error.message}`);
  const input = Buffer.from(await data.arrayBuffer());
  const output = await sharp(input)
    .rotate() // honour the camera orientation before it is stripped
    .resize({ width: thumbWidthFor(path), withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
  return { input, output };
}

async function inBatches(items, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (next < items.length) await worker(items[next++]);
    }),
  );
}

const mb = (bytes) => (bytes / 1048576).toFixed(1);
const kb = (bytes) => Math.round(bytes / 1024);

const files = await listAll(ROOT);
const have = new Set(files.map((f) => f.path));
const originals = files.filter((f) => IMAGE_EXT.test(f.path) && !THUMB_NAME.test(f.path));
const missing = originals.filter((f) => !have.has(thumbPathFor(f.path)));

console.log(`images: ${originals.length} (${mb(originals.reduce((s, f) => s + f.size, 0))} MB)`);
console.log(`already have a small copy: ${originals.length - missing.length}`);
console.log(`missing: ${missing.length} (${mb(missing.reduce((s, f) => s + f.size, 0))} MB of originals to read)`);

if (SAMPLE > 0) {
  // Biggest first: those are the ones that cost the most egress today.
  const picks = [...missing].sort((a, b) => b.size - a.size).slice(0, SAMPLE);
  for (const f of picks) {
    const { input, output } = await makeThumb(f.path);
    console.log(`sample  ${kb(input.length)} KB -> ${kb(output.length)} KB  ${thumbPathFor(f.path).split("/").slice(-2).join("/")}`);
  }
}

if (!WRITE) {
  console.log("Dry run: nothing uploaded. Add --write to upload the missing small copies.");
  process.exit(0);
}

let made = 0;
let skipped = 0;
let failed = 0;
let bytes = 0;
await inBatches(missing, async (f) => {
  try {
    const { output } = await makeThumb(f.path);
    const { error } = await storage.upload(thumbPathFor(f.path), output, {
      contentType: "image/webp",
      cacheControl: ONE_YEAR,
      upsert: false,
    });
    if (error) {
      if (/exists|duplicate/i.test(error.message)) skipped += 1;
      else throw new Error(error.message);
    } else {
      made += 1;
      bytes += output.length;
    }
  } catch (e) {
    failed += 1;
    console.warn(`failed  ${f.path}: ${e instanceof Error ? e.message : e}`);
  }
  const done = made + skipped + failed;
  if (done % 50 === 0) console.log(`${done} / ${missing.length}`);
});

console.log(`uploaded ${made} (${mb(bytes)} MB), already there ${skipped}, failed ${failed}`);
process.exit(failed ? 1 : 0);
