/**
 * Enrichment of USER items (phase 05.E). Runs server-side AFTER the save, never blocks or fails it.
 *   T0 (free): palette/metrics/colour tags from the image, parser over title/note/page text, user quick tags.
 *   T1 (free): perceptual-hash near-match against PUBLISHED Discover images -> inherit their public tags.
 *   T3 (AI, private images): only with the user's opt-in (phase 12) and under the monthly quota. NOT wired yet: default off.
 * Private-image tags are never shared. User edits win: an item with analysis.locked only gets its palette refreshed.
 */
import { readFileSync } from "node:fs";
import { engineConfig } from "./config.mjs";
import { analyzePixels } from "./palette.mjs";
import { phashFromGray } from "./phash.mjs";
import { matchTerms, mergeTags } from "./tags.mjs";
import { loadTaxonomy } from "./taxonomy.mjs";

let taxCache = null;
export function defaultTaxonomy() {
  if (!taxCache) taxCache = loadTaxonomy(JSON.parse(readFileSync(new URL("../../taxonomy/taxonomy.json", import.meta.url), "utf8")));
  return taxCache;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Picks the image to analyse: only http(s) URLs (never data:/blob:), and the dedicated image field first. */
export function imageUrlOf(item) {
  const order = item.type === "image" ? [item.assetUrl, item.previewUrl, item.thumbnailUrl] : [item.previewUrl, item.thumbnailUrl];
  return order.find(u => typeof u === "string" && /^https:\/\//i.test(u)) || "";
}

function textOf(item) {
  const c = item.captureContext || {};
  return [item.title, item.note, c.pageTitle, c.selectionText, c.linkPreview?.siteName].filter(Boolean).join(" . ");
}

/** Pure merge of one item's enrichment results into item.analysis. */
export function applyEnrichment(item, { pixel, textTags, inherited, tax, cfg }) {
  const analysis = { ...(item.analysis || {}) };
  const locked = analysis.locked === true;
  const quick = (item.captureContext?.quickTags || []).map(t => tax.lookup(t)).filter(Boolean).map(id => ({ id, conf: 1, src: "user" }));
  const lists = locked ? [] : [pixel?.tags || [], textTags, inherited || [], quick];
  const { tagsJson, tagsIds } = mergeTags(lists, tax, { minConf: cfg.TAG_MIN_CONF });
  if (pixel) {
    analysis.palette = pixel.palette.map(p => ({ hex: p.hex, pct: p.pct }));
    analysis.colors = pixel.palette.map(p => p.hex); // real colours from pixels (the old keyword guess is gone)
    analysis.metrics = pixel.metrics;
  }
  if (!locked) {
    analysis.tagIds = tagsIds;
    analysis.tagsJson = tagsJson;
    // Existing chip UI reads analysis.tags: add the Thai label (fallback English) of each confident taxonomy tag.
    const labels = tagsJson.filter(t => t.conf >= cfg.TAG_MIN_CONF).map(t => tax.label(t.id));
    analysis.tags = [...new Set([...(analysis.tags || []), ...labels])].slice(0, 24);
    analysis.tagSource = "engine";
  }
  analysis.enrichLevel = Math.max(Number(analysis.enrichLevel) || 0, pixel ? 1 : 0, inherited?.length ? 2 : 0);
  analysis.enrichedAt = new Date().toISOString();
  return { ...item, analysis };
}

async function defaultDeps() {
  const { default: sharp } = await import("sharp");
  const { safeFetch } = await import("../import/safe-fetch.mjs");
  const store = await import("../vault-capture-store.mjs");
  const { supabaseRest, supabaseUrl, serviceRoleKey } = await import("../supabase-rest.mjs");
  return {
    loadItem: store.readCaptureItem,
    saveItem: store.writeCaptureItem,
    async fetchImage(url) {
      const res = await safeFetch(url, { maxBytes: MAX_IMAGE_BYTES, accept: t => /^image\/(png|jpe?g|webp|gif|avif)$/.test(t), acceptHeader: "image/*" });
      return res.body;
    },
    async decode(buffer) {
      const base = sharp(buffer, { failOn: "none" }).rotate();
      const meta = await sharp(buffer, { failOn: "none" }).metadata();
      const { data, info } = await base.clone().resize(128, 128, { fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const gray = await base.clone().greyscale().resize(32, 32, { fit: "fill" }).raw().toBuffer();
      return { pixels: { data: new Uint8ClampedArray(data), width: info.width, height: info.height }, srcW: meta.width || info.width, srcH: meta.height || info.height, gray };
    },
    async inherit(phash) {
      if (!serviceRoleKey()) return null;
      const rows = await supabaseRest("/rest/v1/rpc/discover_inherit_tags", { method: "POST", body: { p_phash: phash, p_max_distance: 4 }, feature: "Tag inheritance", errorMessage: "inherit failed" });
      return Array.isArray(rows) && rows[0] ? rows[0] : null;
    },
  };
}

/** Core: item in, enriched item out (no storage). Never throws; image problems degrade to the text-only result. */
export async function computeEnrichment(item, d) {
  const tax = d.taxonomy || defaultTaxonomy();
  const cfg = d.cfg || engineConfig;
  const textTags = matchTerms(textOf(item), tax).map(m => ({ id: m.id, conf: 0.8, src: "meta" }));
  let pixel = null;
  let inherited = null;
  const url = imageUrlOf(item);
  if (url) {
    try {
      const buffer = await d.fetchImage(url);
      if (buffer?.length) {
        const decoded = await d.decode(buffer);
        pixel = analyzePixels(decoded.pixels, cfg, { width: decoded.srcW, height: decoded.srcH });
        // T1: near-match of a published public image shares its public tags (never anything private).
        const match = await d.inherit?.(phashFromGray(decoded.gray));
        if (match?.tags_ids?.length) inherited = match.tags_ids.map(id => ({ id, conf: 0.7, src: "inherited" }));
      }
    } catch {
      // A blocked/slow image is fine: the text-only result below is still saved.
    }
  }
  return applyEnrichment(item, { pixel, textTags, inherited, tax, cfg });
}

/** Stateless variant for local-first (browser-only) items: returns the new analysis, stores nothing. */
export async function enrichPreview(item, deps = null) {
  const d = deps || (await defaultDeps());
  const updated = await computeEnrichment(item, d);
  return updated.analysis;
}

/**
 * Enriches one saved item. Returns { status, level, tags } and never throws (callers may also use fireEnrich).
 * `deps` lets tests inject loaders/decoders; production uses the real ones.
 */
export async function enrichItem(objectId, auth, deps = null) {
  try {
    const d = deps || (await defaultDeps());
    const item = await d.loadItem(objectId, auth);
    if (!item) return { objectId, status: "skipped", reason: "item not found" };
    const updated = await computeEnrichment(item, d);
    await d.saveItem(objectId, updated, auth);
    return { objectId, status: "enriched", level: updated.analysis.enrichLevel, tags: (updated.analysis.tagIds || []).length };
  } catch (error) {
    return { objectId, status: "failed", reason: String(error?.message || error).slice(0, 160) };
  }
}

/** Fire-and-forget: on Vercel the work is registered with waitUntil so it survives the response. */
export async function fireEnrich(objectId, auth) {
  const run = enrichItem(objectId, auth).catch(() => {});
  try {
    const { waitUntil } = await import("@vercel/functions");
    waitUntil(run);
  } catch {
    /* local server: the promise just keeps running */
  }
}
