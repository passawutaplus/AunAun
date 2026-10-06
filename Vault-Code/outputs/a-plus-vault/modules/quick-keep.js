import { esc, escA } from "./utils.js";

/**
 * Quick Keep: images shared into the installed PWA (Android "Share > A+ Vault") wait here until the person
 * confirms. sw.js writes them to IndexedDB (nothing is uploaded yet); the app reads them on the next load.
 * Same DB/store names as sw.js.
 */
const DB_NAME = "aplus-vault-share";
const STORE = "pending";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("no indexedDB"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** [{ id, at, files: File[], title, text, url }] oldest first. Never throws. */
export async function readPendingShare() {
  try {
    const db = await openDb();
    const rows = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows.filter(r => r && Array.isArray(r.files) && r.files.length).sort((a, b) => (a.at || 0) - (b.at || 0));
  } catch (e) {
    return [];
  }
}

export async function clearPendingShare(ids) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      (ids || []).forEach(id => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    /* nothing to clear */
  }
}

const MAX_THUMBS = 6;

/** The sheet. `thumbs` are object URLs made by the caller (and revoked by it). */
export function quickKeepMarkup({ thumbs, total, host, reasons, collections }) {
  const more = total > thumbs.length ? `<span class='qk-more'>+${total - thumbs.length}</span>` : "";
  return `<div class='qk-backdrop' data-qk-close role='presentation'><section class='qk-sheet' role='dialog' aria-modal='true' aria-label='Keep in Vault'>
    <header class='qk-head'><div><span class='section-label'>Keep in Vault</span><h2>${total} image${total === 1 ? "" : "s"}${host ? ` <small>from ${esc(host)}</small>` : ""}</h2></div><button type='button' class='icon-button' data-qk-close aria-label='Close'>&times;</button></header>
    <div class='qk-thumbs'>${thumbs.slice(0, MAX_THUMBS).map(u => `<img src='${escA(u)}' alt='' />`).join("")}${more}</div>
    <p class='qk-label'>Why are you keeping this? <span>(optional)</span></p>
    <div class='kept-chips' role='group' aria-label='Why you are keeping this'>${reasons.map(r => `<button type='button' class='kept-chip' data-qk-reason='${escA(r.id)}' aria-pressed='false'>${esc(r.label)}</button>`).join("")}</div>
    <input class='kept-text' data-qk-text maxlength='80' placeholder='One line, e.g. background color for the coffee shop'>
    <label class='qk-label' for='qk-collection'>Put it in</label>
    <select id='qk-collection' class='qk-select' data-qk-collection><option value=''>Inbox: sort it later</option>${collections.map(c => `<option value='${escA(c.id)}'>${esc(c.name)}</option>`).join("")}</select>
    <div class='qk-actions'><button type='button' class='ghost-button' data-qk-close>Not now</button><button type='button' class='primary-button' data-qk-keep>Keep</button></div>
  </section></div>`;
}

/** Small snackbar with one action (used for "Kept · Undo"). */
export function snackbarMarkup(message, actionLabel) {
  return `<div class='qk-snack' role='status'><span>${esc(message)}</span>${actionLabel ? `<button type='button' data-qk-undo>${esc(actionLabel)}</button>` : ""}</div>`;
}
