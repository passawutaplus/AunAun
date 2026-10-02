import { esc, escA } from "./utils.js";

/** A4 landscape at 96 dpi, minus print margins. */
const PAGE_W = 1040;
const PAGE_H = 680;

function itemImage(item) {
  if (!item) return "";
  const url = item.type === "image" ? item.assetUrl || item.previewUrl || item.thumbnailUrl : item.thumbnailUrl || item.previewUrl;
  return /^(https?:|data:image\/|blob:)/.test(String(url || "")) ? url : "";
}

function host(url) {
  try {
    return new URL(String(url || "")).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

function objectMarkup(o, item, scale) {
  const box = `left:${o.x * scale}px;top:${o.y * scale}px;width:${o.w * scale}px;height:${o.h * scale}px;transform:rotate(${o.rotation || 0}deg);z-index:${o.zIndex || 1}`;
  if (o.kind === "item") {
    const src = itemImage(item);
    return src
      ? `<img class='o' style='${escA(box)};object-fit:cover' src='${escA(src)}' alt='${escA(item.title || "")}'>`
      : `<div class='o card' style='${escA(box)}'>${esc((item && item.title) || "Reference")}</div>`;
  }
  if (o.kind === "palette") {
    const colors = o.colors && o.colors.length ? o.colors : [o.color];
    return `<div class='o palette' style='${escA(box)}'>${colors.map(c => `<span style='background:${escA(c)}'><i>${esc(String(c).toUpperCase())}</i></span>`).join("")}</div>`;
  }
  if (o.kind === "text") {
    return `<div class='o text' style='${escA(box)};font-size:${Math.max(8, (o.size || 28) * scale)}px;color:${escA(o.color || "#151719")}'>${esc(o.text)}</div>`;
  }
  if (o.kind === "frame") return `<div class='o frame' style='${escA(box)}'><b>${esc(o.text)}</b></div>`;
  if (o.kind === "note" || o.kind === "todo") return `<div class='o note' style='${escA(box)}'>${esc(o.text)}</div>`;
  return "";
}

/**
 * Printable HTML (board page + credits page). The user saves it as PDF from the print dialog.
 * ctx: { itemsById: Map, rightsLabel(item) -> string, siteName }
 */
export function moodboardExportHtml(board, ctx) {
  const objects = (board.objects || []).filter(o => o.kind !== "connector");
  const minX = Math.min(0, ...objects.map(o => o.x));
  const minY = Math.min(0, ...objects.map(o => o.y));
  const maxX = Math.max(1, ...objects.map(o => o.x + o.w));
  const maxY = Math.max(1, ...objects.map(o => o.y + o.h));
  const scale = Math.min(PAGE_W / (maxX - minX), PAGE_H / (maxY - minY), 1.5);
  const shifted = objects.map(o => ({ ...o, x: o.x - minX, y: o.y - minY }));
  const boardMarkup = shifted.map(o => objectMarkup(o, ctx.itemsById.get(o.itemId), scale)).join("");

  const seen = new Set();
  const credits = objects
    .filter(o => o.kind === "item" && o.itemId && !seen.has(o.itemId) && seen.add(o.itemId))
    .map(o => ctx.itemsById.get(o.itemId))
    .filter(Boolean);
  const creditRows = credits.map((item, i) => {
    const c = item.captureContext || {};
    const src = /^https?:\/\//.test(item.sourceUrl || "") ? item.sourceUrl : "";
    const credit = c.attribution || (src ? host(src) : "Uploaded by you");
    return `<tr><td>${i + 1}</td><td><strong>${esc(item.title || "Untitled")}</strong><small>${esc(credit)}</small></td><td>${src ? `<a href='${escA(src)}'>${esc(host(src))}</a>` : "—"}</td><td>${esc(ctx.rightsLabel(item))}</td></tr>`;
  }).join("");

  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `<!doctype html><html lang='en'><head><meta charset='utf-8'><title>${esc(board.name || "Moodboard")} — A+ Vault</title><meta name='robots' content='noindex'>
<style>
@page{size:A4 landscape;margin:12mm}
*{box-sizing:border-box}
body{margin:0;color:#151719;font:13px/1.45 "IBM Plex Sans Thai",system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{page-break-after:always;padding:0}
.page:last-child{page-break-after:auto}
header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
h1{margin:0;font-size:20px}h2{margin:0 0 12px;font-size:16px}
header span{color:#747a80;font-size:11px}
.board{position:relative;width:${Math.ceil((maxX - minX) * scale)}px;height:${Math.ceil((maxY - minY) * scale)}px;margin:0 auto}
.o{position:absolute;border-radius:4px;overflow:hidden}
.card,.note{display:flex;align-items:center;justify-content:center;padding:6px;background:#f7f8fa;border:1px solid #e5e8eb;font-size:11px;text-align:center}
.note{background:#fff6c7;border-color:#f1e08a;align-items:flex-start;justify-content:flex-start;text-align:left;white-space:pre-wrap}
.text{overflow:visible;white-space:pre-wrap;line-height:1.15}
.frame{border:1px dashed #c9ced3;background:transparent}.frame b{display:block;padding:4px 6px;font-size:10px;color:#747a80}
.palette{display:flex}.palette span{flex:1;display:flex;align-items:flex-end;padding:4px}.palette i{font-style:normal;font-size:9px;background:rgba(255,255,255,.8);padding:1px 3px;border-radius:3px}
table{width:100%;border-collapse:collapse}
th,td{padding:7px 8px;border-bottom:1px solid #e5e8eb;text-align:left;vertical-align:top}
th{color:#747a80;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
td small{display:block;color:#747a80;font-size:11px}
a{color:#e33f34;text-decoration:none}
.note-foot{margin-top:12px;color:#747a80;font-size:11px}
</style></head><body>
<section class='page'><header><h1>${esc(board.name || "Moodboard")}</h1><span>${esc(date)} · ${esc(ctx.siteName || "A+ Vault")}</span></header><div class='board'>${boardMarkup}</div></section>
<section class='page'><h2>Image credits &amp; usage rights</h2>${creditRows ? `<table><thead><tr><th>#</th><th>Reference</th><th>Source</th><th>Usage</th></tr></thead><tbody>${creditRows}</tbody></table>` : "<p>No images on this board.</p>"}<p class='note-foot'>Usage labels are guidance, not legal advice. “Reference only” images are for inspiration — license them before using in final work.</p></section>
<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),300))</script>
</body></html>`;
}
