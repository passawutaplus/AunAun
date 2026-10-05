/** Small pure helpers for Quick/Full keep, batches and text-fragment links (phase 11.A/D/H). */

/** Quick keep ON saves immediately; OFF opens the full panel. A page with no usable target always opens the panel. */
export function decideKeep({ quickKeep = false, hasTarget = true } = {}) {
  return quickKeep === true && hasTarget ? "save-now" : "open-panel";
}

/** Last used collection if it still exists, else My Vault ("all"). */
export function pickCollection(lastId, collections) {
  const found = (collections || []).find(c => c && c.id === lastId && c.id !== "all");
  return found ? found.id : "all";
}

export const QUICK_RESULT_MS = 6000;

export function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Payloads for POST /api/vault/capture-batch: URLs + source + credit only (the extension never downloads page images in bulk). */
export function buildBatchItems(selected, { pageUrl, title, credit }) {
  return selected.map(c => ({
    type: "image",
    title: String(c.alt || title || "").slice(0, 120),
    assetUrl: c.url,
    previewUrl: c.url,
    sourceUrl: pageUrl,
    imageWidth: c.width || null,
    imageHeight: c.height || null,
    captureContext: { method: "extension_keep_all", pageUrl, pageTitle: title || null, imageUrl: c.url, credit: credit ? { ...credit, imageUrl: c.url } : null },
  }));
}

/** Sums per-request batch responses into the "Kept n · k skipped" line. */
export function summarizeBatches(responses) {
  const total = { kept: 0, duplicates: 0, failed: 0, ids: [] };
  for (const r of responses) {
    total.kept += r.kept || 0;
    total.duplicates += r.duplicates || 0;
    total.failed += r.failed || 0;
    for (const x of r.results || []) if (x.status === "kept" && x.objectId) total.ids.push(x.objectId);
  }
  const skipped = total.duplicates;
  total.text = `Kept ${total.kept}${skipped ? ` · ${skipped} skipped (already kept)` : ""}${total.failed ? ` · ${total.failed} failed` : ""}`;
  return total;
}

/** Link back to a highlighted passage: https://page#:~:text=start,end (long selections use start,end; short ones the whole text). */
export function textFragmentUrl(pageUrl, selection) {
  const s = String(selection || "").replace(/\s+/g, " ").trim();
  if (!s || !/^https?:\/\//i.test(pageUrl || "")) return pageUrl || "";
  const enc = t => encodeURIComponent(t).replace(/-/g, "%2D");
  const fragment = s.length <= 80 ? enc(s) : `${enc(s.slice(0, 40).trim())},${enc(s.slice(-40).trim())}`;
  const u = new URL(pageUrl);
  u.hash = `:~:text=${fragment}`;
  return u.toString();
}

/** "#tag" words and the note without them, from what the user typed in the save form. */
export function parseTagsAndNote(text) {
  const tags = [];
  const note = String(text || "").replace(/(^|\s)#([\p{L}\p{M}\p{N}_-]{2,30})/gu, (_, sp, tag) => { if (tags.length < 8) tags.push(tag.toLowerCase()); return sp; }).replace(/\s+/g, " ").trim();
  return { tags, note };
}
