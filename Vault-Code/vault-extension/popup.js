const DEFAULT_API_BASE = "https://aplus-vault.vercel.app";
const NEW_COLLECTION_VALUE = "__new__";
const DEFAULT_COLLECTIONS = [
  { id: "all", name: "Vault Library", system: true },
  { id: "brand", name: "Aplus1 Branding", system: false },
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
const keepPendingBtn = document.getElementById("keepPendingBtn");
const clearPendingBtn = document.getElementById("clearPendingBtn");
const snapshotBtn = document.getElementById("snapshotBtn");
const stayOnPageInput = document.getElementById("stayOnPageInput");
const recentList = document.getElementById("recentList");
const clearRecentBtn = document.getElementById("clearRecentBtn");
const openVaultBtn = document.getElementById("openVaultBtn");
const tokenInput = document.getElementById("tokenInput");
const apiBaseInput = document.getElementById("apiBaseInput");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
let pendingCapture = null;
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
    "pendingCapture"
  ]);

  tokenInput.value = data.vaultToken || "";
  apiBaseInput.value = data.apiBase || DEFAULT_API_BASE;
  stayOnPageInput.checked = typeof data.stayOnPageAfterSave === "boolean" ? data.stayOnPageAfterSave : true;
  const statusFromStorage = Boolean(data.lastVaultStatus?.message);

  if (data.lastVaultStatus?.message) {
    setStatus(data.lastVaultStatus.message, data.lastVaultStatus.type || "default");
  }

  renderRecent(data.recentCaptures || []);
  await loadCollections();
  if (data.pendingCapture) renderPendingCapture(data.pendingCapture);
  if (!data.pendingCapture) {
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
  const payload = {
    ...pendingCapture,
    title: titleInput.value.trim() || pendingCapture.title || fallbackTitle(pendingCapture),
    note: noteInput.value.trim() || pendingCapture.note || null,
    collectionId,
    captureContext: {
      ...(pendingCapture.captureContext || {}),
      usageNote: "Private reference only",
      ...collectionMeta
    }
  };

  setStatus("Saving to Vault...", "loading");
  const response = await chrome.runtime.sendMessage({
    type: "VAULT_SAVE_CAPTURE_PAYLOAD",
    payload
  });

  if (response?.ok) {
    pendingCapture = null;
    captureCard.hidden = true;
    setStatus("Saved to Vault Library", "success");
    await refreshRecent();
    return;
  }

  setStatus(response?.error || "Couldn't save this object.", "error");
});

clearPendingBtn.addEventListener("click", async () => {
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

stayOnPageInput.addEventListener("change", async () => {
  await chrome.storage.local.set({ stayOnPageAfterSave: stayOnPageInput.checked });
  setStatus(stayOnPageInput.checked ? "Saving will keep you on the page." : "Saving will open the saved object in a new tab.", "success");
});

saveSettingsBtn.addEventListener("click", async () => {
  const vaultToken = tokenInput.value.trim();
  const apiBase = normalizeApiBase(apiBaseInput.value);

  if (!vaultToken) {
    setStatus("Please paste your alpha token.", "error");
    return;
  }

  await chrome.storage.local.set({ vaultToken, apiBase });
  setStatus("Settings saved.", "success");
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
  chrome.tabs.create({ url: item?.objectUrl || `${apiBase}/vault` });
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
    setStatus(`Vault server offline. Start ${base} before saving.`, "error");
  }
}

function normalizeApiBase(value) {
  return (value || DEFAULT_API_BASE).trim().replace(/\/+$/, "");
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
    `<option value="all">Vault Library</option>`,
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
