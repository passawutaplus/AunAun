import { parseTagsAndNote, quickKeepEnabled } from "./lib/keep.js";

const DEFAULT_API_BASE = "https://aplus-vault.vercel.app";
const ALLOWED_API_BASES = [
  "https://aplus-vault.vercel.app",
  "https://aplus-vault-demo.vercel.app",
  "http://127.0.0.1:5177",
  "http://localhost:5177"
];
const NEW_COLLECTION_VALUE = "__new__";
const DEFAULT_COLLECTIONS = [
  { id: "all", name: "My Vault", system: true },
  { id: "brand", name: "SAMECOR Branding", system: false },
  { id: "web", name: "WP Catalog", system: false },
  { id: "campaign", name: "Blacksmith Ads", system: false }
];

const statusEl = document.getElementById("status");
const captureCard = document.getElementById("captureCard");
const capturePreview = document.getElementById("capturePreview");
const captureType = document.getElementById("captureType");
const captureSource = document.getElementById("captureSource");
const duplicateHint = document.getElementById("duplicateHint");
const titleInput = document.getElementById("titleInput");
const collectionInput = document.getElementById("collectionInput");
const newCollectionInput = document.getElementById("newCollectionInput");
const noteInput = document.getElementById("noteInput");

function selectedReasons() { return []; }
const keepPendingBtn = document.getElementById("keepPendingBtn");
const clearPendingBtn = document.getElementById("clearPendingBtn");
const snapshotBtn = document.getElementById("snapshotBtn");
const recentList = document.getElementById("recentList");
const clearRecentBtn = document.getElementById("clearRecentBtn");
const openVaultBtn = document.getElementById("openVaultBtn");
const tokenInput = document.getElementById("tokenInput");
const apiBaseInput = document.getElementById("apiBaseInput");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const uploadZone = document.getElementById("uploadZone");
let pendingCapture = null;
const EMBED = new URLSearchParams(location.search).get("embed") === "1";
let recentCapturesCache = [];
let collectionsCache = [];

init();

async function init() {
  const data = await chrome.storage.local.get([
    "vaultToken",
    "apiBase",
    "lastVaultStatus",
    "stayOnPageAfterSave",
    "recentCaptures",
    "pendingCapture",
    "embedEdit"
  ]);

  // Dev only: run chrome.storage.local.set({ devMode: true }) in the popup console to show the Advanced box.
  chrome.storage.local.get("devMode").then(({ devMode }) => { document.getElementById("devAdvanced").hidden = devMode !== true; });
  tokenInput.value = data.vaultToken || "";
  apiBaseInput.value = normalizeApiBase(data.apiBase);
  const statusFromStorage = Boolean(data.lastVaultStatus?.message);

  if (data.lastVaultStatus?.message) {
    setStatus(data.lastVaultStatus.message, data.lastVaultStatus.type || "default");
  }

  renderRecent(data.recentCaptures || []);
  await loadCollections();
  if (EMBED) {
    document.documentElement.classList.add("embed");
    if (data.embedEdit) renderPendingCapture(data.embedEdit);
    try { parent.postMessage({ type: "VAULT_EMBED_READY" }, "*"); } catch (_) {}
  } else if (data.pendingCapture) renderPendingCapture(data.pendingCapture);
  if (!data.pendingCapture && !EMBED) {
    await checkServerHealth(apiBaseInput.value, statusFromStorage);
  }
}

keepPendingBtn.addEventListener("click", async () => {
  if (!pendingCapture) {
    setStatus("No object selected yet.", "error");
    return;
  }

  if (collectionInput.value === NEW_COLLECTION_VALUE) {
    setStatus("Type a collection name first.", "error");
    showNewCollectionInput();
    return;
  }

  const collectionId = collectionInput.value || "all";
  const collectionMeta = collectionMetaForSave(collectionId);
  if (pendingCapture.editObjectId) {
    setStatus("Saving details...", "loading");
    const edit = await chrome.runtime.sendMessage({
      type: "VAULT_UPDATE_DETAILS",
      objectId: pendingCapture.editObjectId,
      title: titleInput.value.trim(),
      note: parseTagsAndNote(noteInput.value).note,
      collectionId,
      collectionName: collectionMeta.collectionName || ""
    });
    if (edit?.ok) {
      pendingCapture = null;
      captureCard.hidden = true;
      if (EMBED) {
        await chrome.storage.local.remove(["embedEdit"]);
        try { parent.postMessage({ type: "VAULT_DETAILS_SAVED" }, "*"); } catch (_) {}
      } else {
        await chrome.runtime.sendMessage({ type: "VAULT_DISMISS_PENDING_CAPTURE" });
      }
      setStatus("Details saved", "success");
      return;
    }
    setStatus(edit?.error || "Couldn't save the details.", "error");
    return;
  }
  const typed = parseTagsAndNote(noteInput.value);
  const payload = {
    ...pendingCapture,
    title: titleInput.value.trim() || pendingCapture.title || fallbackTitle(pendingCapture),
    note: typed.note || pendingCapture.note || null,
    quickKeywords: typed.tags.length ? typed.tags.join(", ") : pendingCapture.quickKeywords,
    collectionId,
    captureContext: {
      ...(pendingCapture.captureContext || {}),
      usageNote: "Private reference only",
      ...(selectedReasons().length ? { keptFor: { reasons: selectedReasons(), text: "" } } : {}),
      ...collectionMeta
    }
  };
  chrome.storage.local.set({ lastCollectionId: collectionId, lastKeptReasons: selectedReasons() });

  setStatus("Saving to Vault...", "loading");
  const response = await chrome.runtime.sendMessage({
    type: "VAULT_SAVE_CAPTURE_PAYLOAD",
    payload
  });

  if (response?.ok) {
    pendingCapture = null;
    captureCard.hidden = true;
    setStatus("Saved to My Vault", "success");
    await refreshRecent();
    return;
  }

  setStatus(response?.error || "Couldn't save this object.", "error");
});

clearPendingBtn?.addEventListener("click", async () => {
  pendingCapture = null;
  captureCard.hidden = true;
  await chrome.runtime.sendMessage({ type: "VAULT_DISMISS_PENDING_CAPTURE" });
  hideStatus();
});

snapshotBtn.addEventListener("click", async () => {
  setStatus("Drag on the page to capture.", "pending");
  const response = await chrome.runtime.sendMessage({ type: "VAULT_START_SNAPSHOT_ACTIVE" });
  if (!response?.ok) {
    setStatus(response?.error || "Couldn't start snapshot.", "error");
  } else {
    window.close();
  }
});

saveSettingsBtn.addEventListener("click", async () => {
  const vaultToken = tokenInput.value.trim();
  const rawBase = apiBaseInput.value.trim().replace(/\/+$/, "") || DEFAULT_API_BASE;
  const apiBase = normalizeApiBase(rawBase);

  if (!vaultToken) {
    setStatus("Please paste your Vault token.", "error");
    return;
  }
  if (/\s/.test(vaultToken) || vaultToken.length > 4096) {
    setStatus("That doesn't look like a Vault token. Copy it again from Vault → Profile → Settings.", "error");
    return;
  }
  if (apiBase !== rawBase) {
    apiBaseInput.value = apiBase;
    setStatus(`Only A+ Vault addresses are allowed. Using ${apiBase}.`, "error");
    return;
  }

  await chrome.storage.local.set({ vaultToken, apiBase });
  setStatus("Settings saved.", "success");
  await checkServerHealth(apiBase, true);
  await syncCollectionsFromServer();
  renderCollectionOptions(collectionInput.value || "all");
});

uploadZone?.addEventListener("click", async () => {
  const { apiBase } = await getSettings();
  chrome.tabs.create({ url: `${apiBase}/vault` });
});

clearRecentBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ recentCaptures: [] });
  renderRecent([]);
});

openVaultBtn.addEventListener("click", async () => {
  const { apiBase } = await getSettings();
  chrome.tabs.create({ url: `${apiBase}/vault` });
});

collectionInput.addEventListener("change", () => {
  if (collectionInput.value === NEW_COLLECTION_VALUE) {
    showNewCollectionInput();
    return;
  }
  hideNewCollectionInput();
});

newCollectionInput.addEventListener("keydown", async event => {
  if (event.key === "Enter") {
    event.preventDefault();
    await commitNewCollection();
    return;
  }
  if (event.key === "Escape") {
    hideNewCollectionInput("all");
  }
});

newCollectionInput.addEventListener("blur", () => {
  window.setTimeout(async () => {
    if (newCollectionInput.hidden) return;
    if (newCollectionInput.value.trim()) await commitNewCollection();
    else hideNewCollectionInput("all");
  }, 0);
});

recentList.addEventListener("click", async event => {
  const button = event.target.closest("[data-open-recent]");
  if (!button) return;
  const { recentCaptures = [] } = await chrome.storage.local.get(["recentCaptures"]);
  const item = recentCaptures.find(row => row.objectId === button.dataset.openRecent);
  const { apiBase } = await getSettings();
  chrome.tabs.create({ url: sameOriginUrl(item?.objectUrl, apiBase) || `${apiBase}/vault` });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.recentCaptures) renderRecent(changes.recentCaptures.newValue || []);
  if (changes.vaultCollections) {
    const stored = Array.isArray(changes.vaultCollections.newValue) ? changes.vaultCollections.newValue : [];
    collectionsCache = mergeCollections(DEFAULT_COLLECTIONS, stored);
    renderCollectionOptions(collectionInput.value || "all");
  }
  if (changes.pendingCapture?.newValue) renderPendingCapture(changes.pendingCapture.newValue);
  if (changes.pendingCapture && !changes.pendingCapture.newValue) {
    pendingCapture = null;
    captureCard.hidden = true;
    hideStatus();
  }
  if (changes.lastVaultStatus?.newValue?.message) {
    setStatus(changes.lastVaultStatus.newValue.message, changes.lastVaultStatus.newValue.type || "default");
  }
});

async function refreshRecent() {
  const { recentCaptures = [] } = await chrome.storage.local.get(["recentCaptures"]);
  renderRecent(recentCaptures);
}

async function getSettings() {
  const settings = await chrome.storage.local.get(["apiBase"]);
  return {
    apiBase: normalizeApiBase(settings.apiBase || apiBaseInput.value || DEFAULT_API_BASE)
  };
}

function renderPendingCapture(capture) {
  pendingCapture = capture;
  captureCard.hidden = false;
  statusEl.hidden = true;
  titleInput.value = capture.title || fallbackTitle(capture);
  noteInput.value = capture.note || capture.captureContext?.selectionText || "";
  renderCollectionOptions(capture.collectionId || "all");
  hideNewCollectionInput();
  const isSnapshot = capture.captureContext?.method === "extension_snapshot";
  captureType.textContent = isSnapshot ? "Snapshot object" : labelForType(capture.type) + " object";
  captureSource.textContent = host(capture.sourceUrl || capture.captureContext?.linkUrl || capture.captureContext?.pageUrl || "") || "Browser capture";
  capturePreview.innerHTML = previewMarkup(capture);
  renderDuplicateHint(capture);
  const editing = Boolean(capture.editObjectId);
  keepPendingBtn.querySelector("span").textContent = editing ? "Save" : "Keep in Vault";
  document.getElementById("keepAllIconBtn").hidden = editing;
  if (editing) { duplicateHint.hidden = true; captureType.textContent = "Kept — add details"; }
}

function renderDuplicateHint(capture) {
  const duplicate = findRecentDuplicate(capture);
  if (!duplicate) {
    duplicateHint.hidden = true;
    duplicateHint.textContent = "";
    return;
  }
  duplicateHint.hidden = false;
  duplicateHint.textContent = `Looks already kept: ${duplicate.title || "Vault object"}. You can still save another copy.`;
}

function previewMarkup(capture) {
  const preview = capture.previewUrl || capture.thumbnailUrl || capture.assetUrl || capture.captureContext?.imageUrl || "";
  if (capture.type === "image" && preview) {
    return `<img src="${escapeAttr(preview)}" alt="">`;
  }

  if (capture.type === "video" && (capture.assetUrl || capture.captureContext?.videoUrl)) {
    const videoUrl = capture.assetUrl || capture.captureContext.videoUrl;
    return `<video class="capture-video" src="${escapeAttr(videoUrl)}" controls muted preload="metadata"></video>`;
  }

  if (capture.type === "text") {
    return `<div class="text-preview">${escapeHtml(capture.note || capture.captureContext?.selectionText || "Selected text")}</div>`;
  }

  if (preview) {
    return `<img src="${escapeAttr(preview)}" alt="">`;
  }

  return `<div class="link-preview">${escapeHtml(host(capture.sourceUrl || capture.captureContext?.linkUrl || capture.captureContext?.pageUrl || "") || capture.title || "Saved source")}</div>`;
}

function fallbackTitle(capture) {
  if (capture.type === "text") return (capture.note || capture.captureContext?.selectionText || "Saved text").slice(0, 54);
  if (capture.captureContext?.method === "extension_snapshot") return capture.title || "Snapshot";
  if (capture.type === "image") return capture.captureContext?.pageTitle || "Saved image";
  if (capture.type === "video") return capture.captureContext?.pageTitle || host(capture.sourceUrl || capture.assetUrl || capture.captureContext?.videoUrl || "") || "Saved video";
  return capture.title || host(capture.sourceUrl || capture.captureContext?.linkUrl || capture.captureContext?.pageUrl || "") || "Saved source";
}

function renderRecent(items) {
  const list = Array.isArray(items) ? items.slice(0, 3) : [];
  recentCapturesCache = list;
  if (!list.length) {
    recentList.innerHTML = `<p class="empty-state">No recent captures yet.</p>`;
    clearRecentBtn.hidden = true;
    return;
  }

  clearRecentBtn.hidden = false;
  recentList.innerHTML = list.map(item => {
    const label = `${item.title || "Vault object"} - ${labelForType(item.type)} from ${item.domain || host(item.sourceUrl) || "Vault"} ${relativeTime(item.createdAt)}`;
    return `
      <button class="recent-item" data-open-recent="${escapeAttr(item.objectId || "")}" title="${escapeAttr(label)}" aria-label="Open ${escapeAttr(label)}">
        <div class="recent-preview">
          ${item.previewUrl ? `<img src="${escapeAttr(item.previewUrl)}" alt="">` : `<span>${escapeHtml(typeBadge(item.type))}</span>`}
        </div>
      </button>
    `;
  }).join("");
}

function findRecentDuplicate(capture) {
  const keys = duplicateKeys(capture);
  if (!keys.length) return null;
  return recentCapturesCache.find(item => duplicateKeys(item).some(key => keys.includes(key))) || null;
}

function duplicateKeys(item) {
  const context = item?.captureContext || {};
  return [
    item?.sourceUrl,
    item?.assetUrl,
    item?.previewUrl,
    item?.thumbnailUrl,
    context.imageUrl,
    context.linkUrl,
    context.pageUrl,
    context.videoUrl
  ].map(canonicalRef).filter(Boolean);
}

function canonicalRef(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    return url.href;
  } catch (_) {
    return raw;
  }
}

function setStatus(message, type = "default") {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

function hideStatus() {
  statusEl.hidden = true;
  statusEl.textContent = "";
  statusEl.dataset.type = "default";
}

async function checkServerHealth(apiBase, preserveExistingStatus = false) {
  const base = normalizeApiBase(apiBase);
  try {
    const response = await fetch(`${base}/api/vault/health`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
    if (!preserveExistingStatus) hideStatus();
  } catch (_) {
    const local = /^http:\/\/(127\.0\.0\.1|localhost):/.test(base);
    setStatus(local ? `Local Vault server offline. Start ${base} before saving.` : "Can't reach Vault right now. Check your connection.", "error");
  }
}

function normalizeApiBase(value) {
  const base = String(value || DEFAULT_API_BASE).trim().replace(/\/+$/, "");
  try {
    const origin = new URL(base).origin;
    return ALLOWED_API_BASES.includes(origin) ? origin : DEFAULT_API_BASE;
  } catch (_) {
    return DEFAULT_API_BASE;
  }
}

function sameOriginUrl(value, apiBase) {
  try {
    const url = new URL(value);
    return url.origin === new URL(apiBase).origin ? url.href : "";
  } catch (_) {
    return "";
  }
}

function labelForType(type) {
  if (type === "snapshot") return "Snapshot";
  if (type === "image") return "Image";
  if (type === "video") return "Video";
  if (type === "audio") return "Audio";
  if (type === "pdf" || type === "pdf_url") return "PDF";
  if (type === "file" || type === "file_url") return "File";
  if (type === "link") return "Link";
  if (type === "text" || type === "note") return "Text";
  return "Page";
}

function typeBadge(type) {
  if (type === "snapshot") return "SN";
  if (type === "image") return "IMG";
  if (type === "video") return "VID";
  if (type === "audio") return "AUD";
  if (type === "pdf" || type === "pdf_url") return "PDF";
  if (type === "file" || type === "file_url") return "FILE";
  if (type === "link") return "URL";
  if (type === "text" || type === "note") return "TXT";
  return "PG";
}

function relativeTime(value) {
  const time = new Date(value || Date.now()).getTime();
  const diff = Math.max(0, Date.now() - time);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)} d ago`;
}

function host(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch (_) {
    return "";
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

async function loadCollections() {
  const data = await chrome.storage.local.get(["vaultCollections"]);
  const stored = Array.isArray(data.vaultCollections) ? data.vaultCollections : [];
  collectionsCache = mergeCollections(DEFAULT_COLLECTIONS, stored);
  await syncCollectionsFromServer();
  renderCollectionOptions(collectionInput.value || "all");
}

async function syncCollectionsFromServer() {
  const { vaultToken, apiBase } = await chrome.storage.local.get(["vaultToken", "apiBase"]);
  const token = (vaultToken || tokenInput.value || "").trim();
  const base = normalizeApiBase(apiBase || apiBaseInput.value || DEFAULT_API_BASE);
  if (!token) return;

  try {
    const response = await fetch(`${base}/api/vault/collections`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return;
    const data = await response.json();
    const remote = Array.isArray(data.collections) ? data.collections : [];
    const localCustom = collectionsCache.filter(col => !col.system);
    collectionsCache = mergeCollections(DEFAULT_COLLECTIONS, remote.concat(localCustom));
    await persistCollections();
  } catch (_) {}
}

async function pushCollectionToServer(col) {
  const { vaultToken, apiBase } = await chrome.storage.local.get(["vaultToken", "apiBase"]);
  const token = (vaultToken || tokenInput.value || "").trim();
  const base = normalizeApiBase(apiBase || apiBaseInput.value || DEFAULT_API_BASE);
  if (!token || !col) return null;

  try {
    const response = await fetch(`${base}/api/vault/collections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ id: col.id, name: col.name })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.collection || col;
  } catch (_) {
    return null;
  }
}

function mergeCollections(defaults, stored) {
  const map = new Map();
  defaults.forEach(col => map.set(col.id, col));
  stored.forEach(col => {
    if (!col || !col.id || !col.name || col.system) return;
    map.set(col.id, { id: String(col.id), name: String(col.name), system: false });
  });
  return Array.from(map.values());
}

function makeCollectionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function renderCollectionOptions(selectedId) {
  const custom = collectionsCache.filter(col => !col.system);
  collectionInput.innerHTML = [
    `<option value="all">My Vault</option>`,
    ...custom.map(col => `<option value="${escapeAttr(col.id)}">${escapeHtml(col.name)}</option>`),
    `<option value="${NEW_COLLECTION_VALUE}">+ New collection</option>`
  ].join("");

  const valid = selectedId && selectedId !== NEW_COLLECTION_VALUE
    && collectionsCache.some(col => col.id === selectedId);
  collectionInput.value = valid ? selectedId : "all";
}

async function persistCollections() {
  const custom = collectionsCache.filter(col => !col.system);
  await chrome.storage.local.set({ vaultCollections: custom });
}

async function createCollection(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;

  const existing = collectionsCache.find(
    col => !col.system && col.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) return existing;

  const col = { id: makeCollectionId(), name: trimmed, system: false };
  collectionsCache.push(col);
  await persistCollections();
  await pushCollectionToServer(col);
  renderCollectionOptions(col.id);
  return col;
}

function showNewCollectionInput() {
  collectionInput.hidden = true;
  newCollectionInput.hidden = false;
  newCollectionInput.value = "";
  newCollectionInput.focus();
}

function hideNewCollectionInput(revertValue) {
  newCollectionInput.hidden = true;
  collectionInput.hidden = false;
  if (revertValue) collectionInput.value = revertValue;
}

async function commitNewCollection() {
  const name = newCollectionInput.value.trim();
  if (!name) {
    hideNewCollectionInput("all");
    return;
  }

  const col = await createCollection(name);
  hideNewCollectionInput();
  collectionInput.value = col?.id || "all";
}

function collectionMetaForSave(collectionId) {
  const col = collectionsCache.find(entry => entry.id === collectionId);
  if (!col || col.system) return {};
  return { collectionName: col.name };
}

// ---------------------------------------------------------------- Phase 11: quick keep, undo, queue, Keep All, connect
const quickKeepInput = document.getElementById("quickKeepInput");
const keepAllBtn = document.getElementById("keepAllBtn");
const keepAllLabel = document.getElementById("keepAllLabel");
const quickCard = document.getElementById("quickCard");
const queueRow = document.getElementById("queueRow");
const connectText = document.getElementById("connectText");
const disconnectBtn = document.getElementById("disconnectBtn");
let quickTimer = 0;

async function initPhase11() {
  const s = await chrome.storage.local.get(["quickKeep", "vaultToken", "vaultUserName", "smartDetect", "hoverKeep", "vaultQueue"]);
  quickKeepInput.checked = quickKeepEnabled(s.quickKeep);
  renderConnect(Boolean(s.vaultToken), s.vaultUserName || "");
  renderQueue(s.vaultQueue || []);
  chrome.runtime.sendMessage({ type: "VAULT_QUEUE_RETRY" }).catch(() => {});
  refreshKeepAllCount();
}

let connectedName = "";
function renderConnect(connected, name) {
  if (typeof name === "string") connectedName = name;
  connectText.textContent = connected ? (connectedName || "Connected to your Vault") : "Not connected";
  connectText.title = connected ? "Connected to your Vault" : "";
  disconnectBtn.hidden = !connected;
  document.querySelector(".popup")?.classList.toggle("is-guest", !connected);
  const gate = document.getElementById("loginGate");
  if (gate) gate.hidden = connected;
}

function renderQueue(queue) {
  queueRow.hidden = !queue.length;
  document.getElementById("queueText").textContent = queue.length ? `Waiting to send \u00b7 ${queue.length}` : "";
}

async function refreshKeepAllCount() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/i.test(tab.url || "")) { keepAllBtn.disabled = true; return; }
    await chrome.runtime.sendMessage({ type: "VAULT_KEEP_PING_ACTIVE" }).catch(() => {});
    const res = await chrome.tabs.sendMessage(tab.id, { type: "VAULT_KEEP_ALL_COUNT" }).catch(() => null);
    if (res?.ok) keepAllLabel.textContent = `Keep all images (${res.count})`;
  } catch (_) {}
}

quickKeepInput.addEventListener("change", async () => {
  await chrome.storage.local.set({ quickKeep: quickKeepInput.checked });
  setStatus(quickKeepInput.checked ? "Saving instantly: add details afterwards." : "You will see the form before saving.", "success");
});

document.getElementById("keepAllIconBtn")?.addEventListener("click", () => keepAllBtn.click());
keepAllBtn.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({ type: "VAULT_KEEP_ALL_START" });
  if (response?.ok) window.close();
  else setStatus(response?.error || "Couldn't scan this page.", "error");
});

function showQuickCard(last) {
  if (!last) return;
  quickCard.hidden = false;
  document.getElementById("quickTitle").textContent = last.title || "Kept";
  document.getElementById("quickWhere").textContent = `Kept in ${last.collectionName || "My Vault"}`;
  const thumb = document.getElementById("quickThumb");
  thumb.innerHTML = last.previewUrl ? `<img src="${escapeAttr(last.previewUrl)}" alt="" referrerpolicy="no-referrer">` : "";
  const bar = document.getElementById("quickBar");
  bar.style.transition = "none";
  bar.style.width = "100%";
  requestAnimationFrame(() => { bar.style.transition = "width 6s linear"; bar.style.width = "0"; });
  clearTimeout(quickTimer);
  quickTimer = setTimeout(() => { quickCard.hidden = true; }, 6200);
}

document.getElementById("quickUndoBtn").addEventListener("click", async () => {
  clearTimeout(quickTimer);
  const r = await chrome.runtime.sendMessage({ type: "VAULT_UNDO_LAST" });
  quickCard.hidden = true;
  setStatus(r?.ok ? "Removed from your Vault." : "Couldn't undo this one.", r?.ok ? "success" : "error");
  await refreshRecent();
});

document.getElementById("quickEditBtn").addEventListener("click", async () => {
  clearTimeout(quickTimer);
  const { lastQuickKeep } = await chrome.storage.local.get(["lastQuickKeep"]);
  if (!lastQuickKeep?.objectId) return;
  quickCard.hidden = true;
  renderPendingCapture({ ...(lastQuickKeep.payload || {}), title: lastQuickKeep.title || lastQuickKeep.payload?.title || "", note: "", collectionId: "all", editObjectId: lastQuickKeep.objectId });
});

document.getElementById("quickOffBtn").addEventListener("click", async () => {
  quickKeepInput.checked = false;
  await chrome.storage.local.set({ quickKeep: false });
  quickCard.hidden = true;
  setStatus("You will see the form before saving.", "success");
});

document.getElementById("queueRetryBtn").addEventListener("click", async () => {
  setStatus("Retrying...", "loading");
  const r = await chrome.runtime.sendMessage({ type: "VAULT_QUEUE_RETRY" });
  setStatus(r?.remaining ? `Still waiting \u00b7 ${r.remaining}` : "Sent.", r?.remaining ? "pending" : "success");
});

document.getElementById("queueClearBtn").addEventListener("click", async () => {
  const { vaultQueue = [] } = await chrome.storage.local.get(["vaultQueue"]);
  for (const q of vaultQueue) await chrome.runtime.sendMessage({ type: "VAULT_QUEUE_REMOVE", id: q.id });
  hideStatus();
});

disconnectBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "VAULT_DISCONNECT" });
  tokenInput.value = "";
  renderConnect(false);
  
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.vaultQueue) renderQueue(changes.vaultQueue.newValue || []);
  if (changes.vaultToken) renderConnect(Boolean(changes.vaultToken.newValue));
  if (changes.vaultUserName) renderConnect(true, changes.vaultUserName.newValue || "");
});

initPhase11();

document.addEventListener("click", event => {
  const btn = event.target.closest("[data-info]");
  if (!btn) return;
  const panel = document.querySelector(`[data-info-panel="${btn.dataset.info}"]`);
  if (!panel) return;
  const open = panel.hidden;
  document.querySelectorAll("[data-info-panel]").forEach(p => { p.hidden = true; });
  document.querySelectorAll("[data-info]").forEach(b => b.setAttribute("aria-expanded", "false"));
  panel.hidden = !open;
  btn.setAttribute("aria-expanded", open ? "true" : "false");
});

document.getElementById("loginBtn")?.addEventListener("click", async () => {
  const { apiBase } = await chrome.storage.local.get(["apiBase"]);
  await chrome.tabs.create({ url: `${normalizeApiBase(apiBase || apiBaseInput.value)}/vault?login=1&from=ext` });
  window.close();
});
