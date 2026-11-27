#!/usr/bin/env node
/**
 * Event scout — store the organiser's official poster in our own storage before a batch is applied.
 *
 *   node .github/scripts/event-scout-covers.mjs <batch.sql> <out.sql>
 *
 * Every event object of the batch (the JSON between $j$ … $j$) may carry
 *   "cover_source_url": "https://<organiser's own page or CDN>/poster.jpg"
 * The picture is downloaded, checked (JPEG / PNG / WebP, at most 8 MB), uploaded to
 *   project-media/anthem/<team account>/events/scout-<hash>.<ext>
 * and the object gets cover_url + cover_width + cover_height instead. The database only accepts
 * covers from that folder (anthem.event_image_ok), so nothing is ever hot-linked.
 *
 * A picture is optional: any failure (no secret, download error, wrong type) is logged and the
 * event goes on without a cover. The batch itself never fails because of a picture.
 *
 * Env (GitHub secrets; without them no picture is stored):
 *   SCOUT_UPLOADER_EMAIL + SCOUT_UPLOADER_PASSWORD + SUPABASE_PUBLISHABLE_KEY
 *     a sign-in that may do one thing only: add scout-* pictures to that folder
 *     (storage policy scout_cover_upload, migration 20261127231000). A leak cannot touch anything else.
 *   SUPABASE_URL (optional, defaults to the production project).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) {
  console.error("usage: event-scout-covers.mjs <batch.sql> <out.sql>");
  process.exit(2);
}

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://zkflkpbmbozrchqncpzi.supabase.co").replace(/\/+$/, "");
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY || "";
const EMAIL = process.env.SCOUT_UPLOADER_EMAIL || "";
const PASSWORD = process.env.SCOUT_UPLOADER_PASSWORD || "";
const CAN_UPLOAD = !!(PUBLISHABLE && EMAIL && PASSWORD);
/** Team account that owns scout events (same id as in public.scout_event_draft). */
const OWNER = "82039b6d-cdf4-4c46-958a-d770d849382c";
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Type from the first bytes: a server's Content-Type is not trusted. */
function sniff(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** [width, height] in pixels, or null when the header cannot be read. */
function size(b, type) {
  if (type === "image/png") return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (type === "image/webp") {
    const kind = b.toString("ascii", 12, 16);
    if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (kind === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (kind === "VP8L") {
      const n = b.readUInt32LE(21);
      return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)];
    }
    return null;
  }
  // JPEG: walk the segments to the first start-of-frame marker
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

let token = "";
/** Signs the uploader in once per run. */
async function uploaderToken() {
  if (token) return token;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: PUBLISHABLE, "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`uploader sign-in failed (${res.status})`);
  token = (await res.json()).access_token || "";
  if (!token) throw new Error("uploader sign-in returned no token");
  return token;
}

async function store(sourceUrl) {
  if (!/^https:\/\//i.test(sourceUrl)) throw new Error("cover_source_url must be https");
  const res = await fetch(sourceUrl, { redirect: "follow", signal: AbortSignal.timeout(20_000), headers: { "user-agent": "event-cover-fetch/1.0" } });
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) throw new Error("picture is larger than 8 MB");
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Error("picture is larger than 8 MB");
  const type = sniff(bytes);
  if (!type) throw new Error("not a JPEG, PNG or WebP picture");
  const dims = size(bytes, type);
  if (!dims || !(dims[0] >= 1 && dims[0] <= 32767 && dims[1] >= 1 && dims[1] <= 32767)) throw new Error("could not read the picture size");

  const name = `scout-${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}.${TYPES[type]}`;
  const path = `project-media/anthem/${OWNER}/events/${name}`;
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${await uploaderToken()}`, apikey: PUBLISHABLE, "content-type": type, "cache-control": "max-age=31536000" },
    body: bytes,
    signal: AbortSignal.timeout(60_000),
  });
  // The file name is a hash of the picture: "already exists" means this very picture is stored.
  if (!up.ok && !/duplicate|already exists/i.test(await up.text())) throw new Error(`upload failed (${up.status})`);
  return { cover_url: `${SUPABASE_URL}/storage/v1/object/public/${path}`, cover_width: dims[0], cover_height: dims[1] };
}

const sql = readFileSync(inFile, "utf8");
const blocks = [...sql.matchAll(/\$j\$\s*(\{[\s\S]*?\})\s*\$j\$/g)];
let out = "";
let last = 0;
let stored = 0;

for (const m of blocks) {
  out += sql.slice(last, m.index);
  last = m.index + m[0].length;
  let event;
  try {
    event = JSON.parse(m[1]);
  } catch {
    out += m[0]; // leave anything unexpected exactly as written; psql reports it
    continue;
  }
  const source = typeof event.cover_source_url === "string" ? event.cover_source_url.trim() : "";
  delete event.cover_source_url;
  // a batch never sets these itself: only a picture stored by this script counts
  delete event.cover_url;
  delete event.cover_width;
  delete event.cover_height;
  if (source) {
    if (!CAN_UPLOAD) {
      console.log(`no cover (uploader secrets are not set): ${event.title}`);
    } else {
      try {
        Object.assign(event, await store(source));
        stored += 1;
        console.log(`cover stored: ${event.title}`);
      } catch (err) {
        console.log(`no cover (${err instanceof Error ? err.message : err}): ${event.title}`);
      }
    }
  }
  const body = JSON.stringify(event, null, 2);
  if (body.includes("$j$")) throw new Error("event text must not contain $j$");
  out += `$j$\n${body}\n$j$`;
}
out += sql.slice(last);

writeFileSync(outFile, out);
console.log(`${blocks.length} event(s), ${stored} cover(s) stored → ${outFile}`);
