#!/usr/bin/env node
/**
 * Event scout — have the organiser's official poster stored in our own storage before a batch is applied.
 *
 *   node .github/scripts/event-scout-covers.mjs <batch.sql> <out.sql>
 *
 * Every event object of the batch (the JSON between $j$ … $j$) may carry
 *   "cover_source_url": "https://<organiser's own page or CDN>/poster.jpg"
 * For each one the edge function scout-cover downloads the picture, checks it (JPEG / PNG / WebP,
 * at most 8 MB) and saves it as project-media/anthem/<team account>/events/scout-<hash>.<ext>;
 * the object then gets cover_url + cover_width + cover_height instead. The database only accepts
 * covers from that folder (anthem.event_image_ok), so nothing is ever hot-linked.
 *
 * A picture is optional: any failure (no ticket, download error, wrong type) is logged and the
 * event goes on without a cover. The batch itself never fails because of a picture.
 *
 * Env: SCOUT_COVER_TICKET — one-time ticket the workflow gets from public.scout_cover_ticket() with
 *      the database secret it already has (no other password or key is involved);
 *      SUPABASE_URL (optional, defaults to the production project).
 */
import { readFileSync, writeFileSync } from "node:fs";

const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) {
  console.error("usage: event-scout-covers.mjs <batch.sql> <out.sql>");
  process.exit(2);
}

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://zkflkpbmbozrchqncpzi.supabase.co").replace(/\/+$/, "");
const TICKET = (process.env.SCOUT_COVER_TICKET || "").trim();

async function store(sourceUrl) {
  if (!/^https:\/\//i.test(sourceUrl)) throw new Error("cover_source_url must be https");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/scout-cover`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ticket: TICKET, url: sourceUrl }),
    signal: AbortSignal.timeout(90_000),
  });
  const answer = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error([answer.error || `status ${res.status}`, answer.detail].filter(Boolean).join(": "));
  const { cover_url, cover_width, cover_height } = answer;
  if (typeof cover_url !== "string" || !Number.isInteger(cover_width) || !Number.isInteger(cover_height)) {
    throw new Error("unexpected answer from scout-cover");
  }
  return { cover_url, cover_width, cover_height };
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
  // a batch never sets these itself: only a picture stored through scout-cover counts
  delete event.cover_url;
  delete event.cover_width;
  delete event.cover_height;
  if (source) {
    if (!TICKET) {
      console.log(`no cover (no ticket): ${event.title}`);
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
