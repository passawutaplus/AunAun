const DEFAULT_API_BASE = "https://aplus-vault.vercel.app";
const DEFAULT_STAY_ON_PAGE = true;
const RECENT_LIMIT = 10;
const latestContextByTab = new Map();

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();

  [
    ["keep-image", "image", "+ Keep in Vault"],
    ["keep-video", "video", "+ Keep in Vault"],
    ["keep-link", "link", "+ Keep in Vault"],
    ["keep-selection", "selection", "+ Keep in Vault"],
    ["keep-page", "page", "+ Keep in Vault"],
    ["snapshot-to-vault", "page", "+ Snapshot to Vault"]
  ].forEach(([id, context, title]) => {
    chrome.contextMenus.create({ id, title, contexts: [context] });
  });

  const { stayOnPageAfterSave } = await chrome.storage.local.get(["stayOnPageAfterSave"]);
  if (typeof stayOnPageAfterSave !== "boolean") {
    await chrome.storage.local.set({ stayOnPageAfterSave: DEFAULT_STAY_ON_PAGE });
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "snapshot-to-vault") {
    await startSnapshot(tab);
    return;
  }

  const capture = await buildSmartCapturePayload(info, tab);
  await setPendingCapture(capture);
  await openCapturePopup();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "VAULT_CONTEXT_CAPTURED") {
      if (sender.tab?.id) latestContextByTab.set(sender.tab.id, message.context);
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "VAULT_SNAPSHOT_RECT") {
      await handleSnapshotRect(message, sender.tab);
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "VAULT_SAVE_CURRENT_PAGE") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const payload = await buildSmartCapturePayload({ menuItemId: "keep-page", pageUrl: tab?.url }, tab);
      const result = await saveCapture(payload, { tabId: tab?.id });
      const { lastVaultStatus } = await chrome.storage.local.get(["lastVaultStatus"]);
      sendResponse({
        ok: Boolean(result),
        result,
        error: result ? null : lastVaultStatus?.message || "Couldn't save this page."
      });
      return;
    }

    if (message?.type === "VAULT_START_SNAPSHOT_ACTIVE") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await startSnapshot(tab);
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "VAULT_UPLOAD_FILE_DATA") {
      const result = await saveUploadFile(message.file || {});
      const { lastVaultStatus } = await chrome.storage.local.get(["lastVaultStatus"]);
      sendResponse({
        ok: Boolean(result),
        result,
        error: result ? null : lastVaultStatus?.message || "Couldn't upload this file."
      });
      return;
    }

    if (message?.type === "VAULT_SAVE_CAPTURE_PAYLOAD") {
      const payload = message.payload || {};
      const snapshotDataUrl = pendingSnapshotDataUrl(payload);
      const result = snapshotDataUrl
        ? await saveSnapshotFile(snapshotDataUrl, stripPendingSnapshotPreview(payload), { tabId: sender.tab?.id })
        : await saveCapture(payload, { tabId: sender.tab?.id });
      const { lastVaultStatus } = await chrome.storage.local.get(["lastVaultStatus"]);
      if (result) await chrome.storage.local.remove(["pendingCapture"]);
      sendResponse({
        ok: Boolean(result),
        result,
        error: result ? null : lastVaultStatus?.message || "Couldn't save this object."
      });
      return;
    }

    if (message?.type === "VAULT_DISMISS_PENDING_CAPTURE") {
      await chrome.storage.local.remove(["pendingCapture"]);
      await setBadge("", "#747a80");
      sendResponse({ ok: true });
      return;
    }
  })().catch(async error => {
    const { apiBase } = await getSettings();
    const message = friendlySaveError(error, apiBase);
    await setStatus("error", message);
    sendResponse({ ok: false, error: message });
  });

  return true;
});

async function buildSmartCapturePayload(info, tab) {
  const fallbackPayload = buildCapturePayload(info, tab);
  if (info.menuItemId === "keep-selection") return fallbackPayload;
  const domContext = await getLatestVaultContext(tab);
  const candidates = [payloadToCandidate(fallbackPayload, info)];
  const visualCandidate = bestVisualCandidate(domContext?.candidates || []);

  if (info.linkUrl && visualCandidate && !info.srcUrl) {
    candidates.push({
      kind: "link",
      title: info.linkText || visualCandidate.title || tab?.title || host(info.linkUrl) || "Saved link",
      sourceUrl: info.linkUrl,
      assetUrl: null,
      previewUrl: visualCandidate.previewUrl || visualCandidate.assetUrl || visualCandidate.thumbnailUrl || null,
      thumbnailUrl: visualCandidate.thumbnailUrl || visualCandidate.previewUrl || visualCandidate.assetUrl || null,
      pageUrl: domContext?.pageUrl || tab?.url || info.pageUrl || null,
      pageTitle: domContext?.pageTitle || tab?.title || null,
      domain: host(info.linkUrl),
      confidence: 0.96,
      captureContext: Object.assign({}, visualCandidate.captureContext || {}, {
        method: "extension_link_dom_preview",
        linkUrl: info.linkUrl,
        pageUrl: domContext?.pageUrl || tab?.url || null,
        pageTitle: domContext?.pageTitle || tab?.title || null,
        imageUrl: visualCandidate.assetUrl || visualCandidate.previewUrl || null
      })
    });
  }

  (domContext?.candidates || []).forEach(candidate => candidates.push(candidate));

  const chosen = chooseBestCandidate(candidates);
  return candidateToPayload(chosen || candidates[0], fallbackPayload, domContext);
}

async function getLatestVaultContext(tab) {
  if (!tab?.id || !isCaptureableUrl(tab.url)) return null;
  try {
    await ensureContentScript(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_LATEST_VAULT_CONTEXT" });
    if (response?.context) {
      latestContextByTab.set(tab.id, response.context);
      return response.context;
    }
  } catch (_) {}
  return latestContextByTab.get(tab.id) || null;
}

function payloadToCandidate(payload, info = {}) {
  const method = payload.captureContext?.method || `extension_${payload.type || "object"}`;
  let confidence = 0.3;
  if (info.srcUrl || payload.type === "image") confidence = 0.9;
  if (payload.type === "video") confidence = 0.72;
  if (payload.type === "link") confidence = detectFileTypeFromUrl(payload.sourceUrl).isDirectFile ? 0.62 : 0.45;
  if (payload.type === "text") confidence = 0.8;
  return {
    kind: payload.type === "image" ? "image" : payload.type === "video" ? "video" : payload.type === "text" ? "text" : payload.type === "page" ? "page" : "link",
    title: payload.title,
    sourceUrl: payload.sourceUrl,
    assetUrl: payload.assetUrl,
    previewUrl: payload.previewUrl || payload.assetUrl || payload.captureContext?.imageUrl || payload.captureContext?.videoPosterUrl || null,
    thumbnailUrl: payload.thumbnailUrl || payload.previewUrl || payload.assetUrl || null,
    pageUrl: payload.captureContext?.pageUrl || null,
    pageTitle: payload.captureContext?.pageTitle || null,
    domain: host(payload.sourceUrl || payload.captureContext?.pageUrl),
    confidence,
    captureContext: Object.assign({ method }, payload.captureContext || {})
  };
}

function chooseBestCandidate(candidates) {
  return candidates
    .filter(Boolean)
    .map(candidate => Object.assign({}, candidate, { confidence: Number(candidate.confidence) || 0 }))
    .sort((a, b) => b.confidence - a.confidence)[0] || null;
}

function bestVisualCandidate(candidates) {
  return (candidates || [])
    .filter(candidate => ["image", "background_image", "video", "page"].includes(candidate.kind) && (candidate.previewUrl || candidate.assetUrl || candidate.thumbnailUrl))
    .sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0))[0] || null;
}

function candidateToPayload(candidate, fallbackPayload, domContext) {
  const fileInfo = detectFileTypeFromUrl(candidate.sourceUrl || candidate.assetUrl || "");
  const method = candidate.captureContext?.method || fallbackPayload.captureContext?.method || "extension_capture";
  const kind = candidate.kind || "link";
  const isImage = kind === "image" || kind === "background_image";
  const isVideo = kind === "video";
  const isText = kind === "text";
  const sourceUrl = candidate.sourceUrl || fallbackPayload.sourceUrl || domContext?.pageUrl || null;
  const previewUrl = candidate.previewUrl || candidate.thumbnailUrl || (isImage ? candidate.assetUrl : null) || fallbackPayload.previewUrl || null;
  const assetUrl = candidate.assetUrl || (isImage ? previewUrl : null) || fallbackPayload.assetUrl || null;
  const captureContext = Object.assign(
    {},
    fallbackPayload.captureContext || {},
    candidate.captureContext || {},
    {
      method,
      pageTitle: candidate.pageTitle || domContext?.pageTitle || fallbackPayload.captureContext?.pageTitle || null,
      pageUrl: candidate.pageUrl || domContext?.pageUrl || fallbackPayload.captureContext?.pageUrl || null,
      imageUrl: candidate.captureContext?.imageUrl || (isImage ? assetUrl : null) || previewUrl || null,
      linkUrl: candidate.captureContext?.linkUrl || (kind === "link" ? sourceUrl : fallbackPayload.captureContext?.linkUrl || null),
      ogImage: candidate.captureContext?.ogImage || domContext?.pageMeta?.ogImage || null,
      twitterImage: candidate.captureContext?.twitterImage || domContext?.pageMeta?.twitterImage || null,
      canonicalUrl: candidate.captureContext?.canonicalUrl || domContext?.pageMeta?.sourceUrl || null
    }
  );

  return {
    type: isImage ? "image" : isVideo ? "video" : isText ? "text" : "link",
    title: candidate.title || fallbackPayload.title || fallbackTitle(fallbackPayload),
    note: fallbackPayload.note || null,
    sourceUrl,
    assetUrl: isImage || isVideo ? assetUrl : fallbackPayload.assetUrl || null,
    previewUrl,
    thumbnailUrl: candidate.thumbnailUrl || previewUrl || null,
    projectId: null,
    collectionId: null,
    mimeType: candidate.mimeType || fileInfo.mimeType || null,
    fileName: candidate.fileName || fileInfo.fileName || null,
    fileExtension: candidate.fileExtension || fileInfo.fileExtension || null,
    captureContext
  };
}

function buildCapturePayload(info, tab) {
  const pageUrl = tab?.url || info.pageUrl || null;
  const pageTitle = tab?.title || null;

  if (info.menuItemId === "keep-image") {
    const imageUrl = info.srcUrl || null;
    return {
      type: "image",
      title: pageTitle || "Saved image",
      note: null,
      sourceUrl: imageUrl,
      assetUrl: imageUrl,
      projectId: null,
      collectionId: null,
      captureContext: {
        method: "extension_image",
        pageTitle,
        pageUrl,
        selectionText: null,
        imageUrl,
        linkUrl: info.linkUrl || null
      }
    };
  }

  if (info.menuItemId === "keep-video") {
    return {
      type: "video",
      title: pageTitle || host(info.srcUrl || pageUrl) || "Saved video",
      note: null,
      sourceUrl: info.srcUrl || pageUrl,
      assetUrl: info.srcUrl || null,
      projectId: null,
      collectionId: null,
      captureContext: {
        method: "extension_video",
        pageTitle,
        pageUrl,
        selectionText: null,
        imageUrl: null,
        videoUrl: info.srcUrl || null,
        linkUrl: null
      }
    };
  }

  if (info.menuItemId === "keep-link") {
    return {
      type: "link",
      title: info.linkText || host(info.linkUrl) || pageTitle || "Saved link",
      note: null,
      sourceUrl: info.linkUrl || null,
      assetUrl: null,
      projectId: null,
      collectionId: null,
      captureContext: {
        method: "extension_link",
        pageTitle,
        pageUrl,
        selectionText: null,
        imageUrl: null,
        linkUrl: info.linkUrl || null
      }
    };
  }

  if (info.menuItemId === "keep-selection") {
    const selected = (info.selectionText || "").trim();
    const selectedUrl = normalizeSelectionUrl(selected);
    if (selectedUrl) {
      return {
        type: "link",
        title: host(selectedUrl) || selectedUrl,
        note: null,
        sourceUrl: selectedUrl,
        assetUrl: null,
        projectId: null,
        collectionId: null,
        captureContext: {
          method: "extension_selected_url",
          pageTitle,
          pageUrl,
          selectionText: selected,
          imageUrl: null,
          linkUrl: selectedUrl
        }
      };
    }

    return {
      type: "text",
      title: "Saved text",
      note: selected || null,
      sourceUrl: pageUrl,
      assetUrl: null,
      projectId: null,
      collectionId: null,
      captureContext: {
        method: "extension_selection",
        pageTitle,
        pageUrl,
        selectionText: selected || null,
        imageUrl: null,
        linkUrl: null
      }
    };
  }

  return {
    type: "page",
    title: pageTitle || host(pageUrl) || "Saved page",
    note: null,
    sourceUrl: pageUrl,
    assetUrl: null,
    projectId: null,
    collectionId: null,
    captureContext: {
      method: "extension_page",
      pageTitle,
      pageUrl,
      selectionText: null,
      imageUrl: null,
      linkUrl: null
    }
  };
}

async function startSnapshot(tab) {
  if (!tab?.id || !isCaptureableUrl(tab.url)) {
    await setStatus("error", "This page cannot be captured by the extension.");
    await setBadge("ERR", "#cc3931");
    return;
  }

  await ensureContentScript(tab.id);
  await chrome.tabs.sendMessage(tab.id, { type: "VAULT_START_SNAPSHOT" });
}

async function openCapturePopup() {
  if (chrome.action.openPopup) {
    try {
      await chrome.action.openPopup();
      return;
    } catch (_) {
      // Chrome often blocks action popup opens from context-menu handlers.
    }
  }

  try {
    await chrome.windows.create({
      url: chrome.runtime.getURL("popup.html?capture=pending"),
      type: "popup",
      width: 390,
      height: 720,
      focused: true
    });
  } catch (_) {
    await chrome.tabs.create({ url: chrome.runtime.getURL("popup.html?capture=pending") });
  }
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "VAULT_PING" });
  } catch (_) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  }
}

async function handleSnapshotRect(message, tab) {
  if (!tab?.id || !message.rect) return;

  await setStatus("loading", "Preparing snapshot preview...");
  await setBadge("...", "#747a80");

  try {
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    const crop = await chrome.tabs.sendMessage(tab.id, {
      type: "VAULT_CROP_SNAPSHOT",
      screenshotDataUrl,
      rect: message.rect,
      devicePixelRatio: message.devicePixelRatio || 1
    });

    if (!crop?.dataUrl) throw new Error("Snapshot crop failed.");

    const payload = {
      type: "image",
      title: `Snapshot from ${message.pageTitle || tab.title || host(message.pageUrl || tab.url) || "page"}`,
      note: null,
      sourceUrl: message.pageUrl || tab.url || null,
      assetUrl: crop.dataUrl,
      previewUrl: crop.dataUrl,
      thumbnailUrl: crop.dataUrl,
      projectId: null,
      collectionId: null,
      captureContext: {
        method: "extension_snapshot",
        pageTitle: message.pageTitle || tab.title || null,
        pageUrl: message.pageUrl || tab.url || null,
        selectionText: null,
        imageUrl: crop.dataUrl,
        linkUrl: null,
        snapshot: {
          x: message.rect.x,
          y: message.rect.y,
          width: message.rect.width,
          height: message.rect.height,
          devicePixelRatio: message.devicePixelRatio || 1
        }
      }
    };

    await setPendingCapture(payload);
    await chrome.tabs.sendMessage(tab.id, { type: "VAULT_TOAST", message: "Snapshot ready. Review it in the Vault popup.", kind: "success" });
    await openCapturePopup();
  } catch (error) {
    await setStatus("error", "Couldn't save snapshot. Please try again.");
    await setBadge("ERR", "#cc3931");
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "VAULT_TOAST", message: "Couldn't save snapshot. Please try again.", kind: "error" });
    } catch (_) {}
  }
}

async function getSettings() {
  const settings = await chrome.storage.local.get(["vaultToken", "apiBase", "stayOnPageAfterSave"]);
  return {
    vaultToken: (settings.vaultToken || "").trim(),
    apiBase: normalizeApiBase(settings.apiBase || DEFAULT_API_BASE),
    stayOnPageAfterSave: typeof settings.stayOnPageAfterSave === "boolean" ? settings.stayOnPageAfterSave : DEFAULT_STAY_ON_PAGE
  };
}

async function saveCapture(payload, options = {}) {
  const { vaultToken, apiBase, stayOnPageAfterSave } = await getSettings();

  if (!vaultToken) {
    await setStatus("error", "Missing Vault token. Open the extension popup and add your token.");
    await setBadge("ERR", "#cc3931");
    await toastTab(options.tabId, "Missing Vault token.", "error");
    return null;
  }

  await setStatus("loading", "Saving to Vault...");
  await setBadge("...", "#747a80");

  try {
    const response = await fetch(`${apiBase}/api/vault/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${vaultToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw httpError(response);
    const data = await response.json();
    const result = await handleSuccessfulSave(data, payload, apiBase, stayOnPageAfterSave);
    await toastTab(options.tabId, "Saved to Vault Library", "success");
    return result;
  } catch (error) {
    if (canUseWebHandoff(apiBase, payload, error)) {
      try {
        const result = await saveViaWebHandoff(payload, apiBase, stayOnPageAfterSave, options);
        if (result) return result;
      } catch (_) {}
    }

    const message = friendlySaveError(error, apiBase);
    await setStatus("error", message);
    await setBadge("ERR", "#cc3931");
    await toastTab(options.tabId, message, "error");
    return null;
  }
}

async function saveSnapshotFile(dataUrl, payload, options = {}) {
  const extension = /^data:image\/jpe?g/i.test(dataUrl || "") ? "jpg" : "png";
  return saveFileDataUrl(dataUrl, payload, `vault-snapshot.${extension}`, "snapshot", options);
}

async function setPendingCapture(payload) {
  await chrome.storage.local.set({
    pendingCapture: payload,
    lastVaultStatus: null
  });
  await setBadge("NEW", "#ff4f43");
}

function pendingSnapshotDataUrl(payload) {
  if (payload.captureContext?.method !== "extension_snapshot") return "";
  const dataUrl = payload.assetUrl || payload.previewUrl || payload.thumbnailUrl || payload.captureContext?.imageUrl || "";
  return /^data:image\//i.test(dataUrl) ? dataUrl : "";
}

function stripPendingSnapshotPreview(payload) {
  return Object.assign({}, payload, {
    assetUrl: null,
    previewUrl: null,
    thumbnailUrl: null,
    captureContext: Object.assign({}, payload.captureContext || {}, {
      imageUrl: null
    })
  });
}

async function saveUploadFile(file) {
  const fileInfo = detectFileTypeFromFile(file);
  const payload = {
    type: fileInfo.payloadType,
    title: file.name || "Vault upload",
    note: null,
    sourceUrl: null,
    assetUrl: null,
    previewUrl: null,
    thumbnailUrl: null,
    projectId: null,
    collectionId: null,
    mimeType: file.type || fileInfo.mimeType || "application/octet-stream",
    fileName: file.name || null,
    fileExtension: fileInfo.fileExtension || null,
    captureContext: {
      method: "extension_upload",
      pageTitle: null,
      pageUrl: null,
      selectionText: null,
      imageUrl: null,
      linkUrl: null
    }
  };
  return saveFileDataUrl(file.dataUrl, payload, file.name || "vault-upload", fileInfo.recentType);
}

async function saveFileDataUrl(dataUrl, payload, fileName, forcedRecentType, options = {}) {
  const { vaultToken, apiBase, stayOnPageAfterSave } = await getSettings();
  if (!vaultToken) {
    await setStatus("error", "Missing Vault token. Open the extension popup and add your token.");
    await setBadge("ERR", "#cc3931");
    return null;
  }

  const blob = await dataUrlToBlob(dataUrl);
  const formData = new FormData();
  formData.append("file", blob, fileName || "vault-file");
  formData.append("payload", JSON.stringify(payload));

  try {
    const response = await fetch(`${apiBase}/api/vault/capture-file`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vaultToken}`
      },
      body: formData
    });

    if (!response.ok) throw httpError(response);
    const data = await response.json();
    const result = await handleSuccessfulSave(data, payload, apiBase, stayOnPageAfterSave, forcedRecentType);
    if (options.tabId) await toastTab(options.tabId, "Saved to Vault Library", "success");
    return result;
  } catch (error) {
    const inlinePayload = isTinyPreviewUrl(dataUrl)
      ? Object.assign({}, payload, {
        assetUrl: dataUrl,
        previewUrl: dataUrl,
        thumbnailUrl: dataUrl,
        captureContext: Object.assign({}, payload.captureContext || {}, { imageUrl: dataUrl })
      })
      : payload;

    if (canUseWebHandoff(apiBase, inlinePayload, error)) {
      try {
        const result = await saveViaWebHandoff(inlinePayload, apiBase, stayOnPageAfterSave, options, forcedRecentType);
        if (result) return result;
      } catch (_) {}
    }

    const message = friendlySaveError(error, apiBase);
    await setStatus("error", message);
    await setBadge("ERR", "#cc3931");
    if (options.tabId) await toastTab(options.tabId, message, "error");
    return null;
  }
}

async function handleSuccessfulSave(data, payload, apiBase, stayOnPageAfterSave, forcedRecentType) {
  const result = normalizeSaveResult(data, payload, apiBase, forcedRecentType);
  await addRecentCapture(result);
  await setStatus("success", "Saved to Vault Library", result.objectId || null);
  await setBadge("OK", "#2c8f68");
  await maybeOpenVaultAfterSave(result, apiBase, stayOnPageAfterSave);
  return result;
}

function normalizeVaultObjectUrl(url, apiBase, objectId) {
  const fallback = objectId ? `${apiBase}/vault#object=${encodeURIComponent(objectId)}` : `${apiBase}/vault`;
  if (!url) return fallback;
  try {
    const parsed = new URL(url, apiBase);
    const fromQuery = parsed.searchParams.get("object");
    const id = fromQuery || objectId;
    if (fromQuery) parsed.searchParams.delete("object");
    parsed.pathname = "/vault";
    if (id) parsed.hash = `object=${encodeURIComponent(id)}`;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

function normalizeSaveResult(data, payload, apiBase, forcedRecentType) {
  const item = data?.item || {};
  const objectId = data?.objectId || item.id || null;
  const method = payload.captureContext?.method || item.captureContext?.method || `extension_${payload.type || "object"}`;
  const type = forcedRecentType || (method === "extension_snapshot" ? "snapshot" : (item.type || payload.type || "page"));
  const responseObjectUrl = data?.objectUrl && data.objectUrl.startsWith("/") ? `${apiBase}${data.objectUrl}` : data?.objectUrl;
  const workspaceObjectUrl = objectId ? `${apiBase}/vault#object=${encodeURIComponent(objectId)}` : `${apiBase}/vault`;
  let objectUrl = responseObjectUrl ? responseObjectUrl.replace(`${apiBase}/#object=`, `${apiBase}/vault#object=`) : workspaceObjectUrl;
  objectUrl = normalizeVaultObjectUrl(objectUrl, apiBase, objectId);
  const sourceUrl = data?.sourceUrl || item.sourceUrl || payload.sourceUrl || payload.captureContext?.pageUrl || null;
  const title = data?.title || item.title || payload.title || fallbackTitle(payload);
  const previewUrl = data?.previewUrl || (isTinyPreviewUrl(item.assetUrl || payload.assetUrl) ? (item.assetUrl || payload.assetUrl) : null);

  return {
    objectId,
    duplicateOf: data?.duplicateOf || null,
    type,
    title,
    sourceUrl,
    domain: host(sourceUrl),
    previewUrl,
    objectUrl,
    createdAt: data?.createdAt || new Date().toISOString(),
    captureMethod: method
  };
}

async function addRecentCapture(item) {
  const { recentCaptures = [] } = await chrome.storage.local.get(["recentCaptures"]);
  const next = [item]
    .concat(Array.isArray(recentCaptures) ? recentCaptures.filter(row => row.objectId !== item.objectId) : [])
    .slice(0, RECENT_LIMIT);
  await chrome.storage.local.set({ recentCaptures: next });
}

async function maybeOpenVaultAfterSave(result, apiBase, stayOnPageAfterSave) {
  if (stayOnPageAfterSave) return;
  await chrome.tabs.create({ url: result.objectUrl || `${apiBase}/vault` });
}

async function saveViaWebHandoff(payload, apiBase, stayOnPageAfterSave, options = {}, forcedRecentType) {
  const encoded = encodeVaultPayload(payload);
  const objectId = `handoff-${Date.now().toString(36)}`;
  const objectUrl = `${apiBase}/vault#vault-capture=${encoded}`;
  const sourceUrl = payload.sourceUrl || payload.captureContext?.linkUrl || payload.captureContext?.pageUrl || null;
  const method = payload.captureContext?.method || `extension_${payload.type || "object"}`;
  const previewUrl = firstPreviewUrl(payload);
  const result = {
    objectId,
    duplicateOf: null,
    type: forcedRecentType || (method === "extension_snapshot" ? "snapshot" : (payload.type || "page")),
    title: payload.title || fallbackTitle(payload),
    sourceUrl,
    domain: host(sourceUrl),
    previewUrl,
    objectUrl,
    createdAt: new Date().toISOString(),
    captureMethod: method,
    handoff: true
  };

  await addRecentCapture(result);
  await setStatus("success", "Sent to Vault Library", result.objectId);
  await setBadge("OK", "#2c8f68");
  await chrome.tabs.create({ url: objectUrl, active: !stayOnPageAfterSave });
  await toastTab(options.tabId, "Sent to Vault Library", "success");
  return result;
}

function canUseWebHandoff(apiBase, payload, error) {
  if (isLocalApiBase(apiBase)) return false;
  if (!/^https?:\/\//i.test(apiBase || "")) return false;
  if ([401, 403, 413].includes(Number(error?.status))) return false;
  if (hasLargeInlineAsset(payload)) return false;
  return true;
}

function isLocalApiBase(apiBase) {
  try {
    const url = new URL(apiBase);
    return ["127.0.0.1", "localhost"].includes(url.hostname);
  } catch (_) {
    return false;
  }
}

function hasLargeInlineAsset(payload) {
  const values = [
    payload?.assetUrl,
    payload?.previewUrl,
    payload?.thumbnailUrl,
    payload?.captureContext?.imageUrl,
    payload?.captureContext?.videoPosterUrl
  ].filter(Boolean);
  return values.some(value => /^data:/i.test(value) && String(value).length >= 120000);
}

function firstPreviewUrl(payload) {
  const value = payload.previewUrl || payload.thumbnailUrl || payload.assetUrl || payload.captureContext?.imageUrl || payload.captureContext?.videoPosterUrl || "";
  return isTinyPreviewUrl(value) ? value : null;
}

function encodeVaultPayload(payload) {
  const json = JSON.stringify(payload || {});
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function httpError(response) {
  const error = new Error(`Request failed: ${response.status}`);
  error.status = response.status;
  return error;
}

async function setStatus(type, message, objectId = null) {
  await chrome.storage.local.set({
    lastVaultStatus: {
      type,
      message,
      objectId,
      updatedAt: new Date().toISOString()
    }
  });
}

async function setBadge(text, color) {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  if (text === "OK" || text === "ERR") {
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2400);
  }
}

async function toastTab(tabId, message, kind) {
  if (!tabId) return;
  try {
    await ensureContentScript(tabId);
    await chrome.tabs.sendMessage(tabId, { type: "VAULT_TOAST", message, kind });
  } catch (_) {}
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

function friendlySaveError(error, apiBase) {
  const message = String(error?.message || "");
  if (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("Load failed")) {
    return `Vault server offline. Start ${apiBase} and try again.`;
  }
  if (message.includes("401")) {
    return "Missing or invalid Vault token. Open the extension popup and add your token.";
  }
  if (message.includes("413") || message.toLowerCase().includes("too large")) {
    return "This file is too large for the current Vault alpha.";
  }
  return "Couldn't save this object. Please try again.";
}

function normalizeSelectionUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || /\s/.test(raw)) return "";
  const candidate = /^https?:\/\//i.test(raw) ? raw : raw.startsWith("www.") ? `https://${raw}` : raw;
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.href;
  } catch (_) {
    return "";
  }
}

function detectFileTypeFromUrl(value) {
  let pathname = "";
  try {
    pathname = new URL(value || "").pathname;
  } catch (_) {
    pathname = value || "";
  }
  const fileName = decodeURIComponent((pathname.split("/").pop() || "").split("?")[0]);
  const fileExtension = (fileName.includes(".") ? fileName.split(".").pop() : "").toLowerCase();
  const image = ["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"];
  const video = ["mp4", "webm", "mov"];
  const audio = ["mp3", "wav", "m4a"];
  const docs = ["pdf", "txt", "md"];
  const design = ["fig", "sketch", "psd", "ai"];
  const model = ["glb", "gltf", "obj", "stl"];
  const archive = ["zip"];
  let kind = "";
  let mimeType = "";
  if (image.includes(fileExtension)) {
    kind = "image";
    mimeType = fileExtension === "svg" ? "image/svg+xml" : `image/${fileExtension === "jpg" ? "jpeg" : fileExtension}`;
  } else if (video.includes(fileExtension)) {
    kind = "video";
    mimeType = `video/${fileExtension === "mov" ? "quicktime" : fileExtension}`;
  } else if (audio.includes(fileExtension)) {
    kind = "audio";
    mimeType = `audio/${fileExtension}`;
  } else if (fileExtension === "pdf") {
    kind = "pdf_url";
    mimeType = "application/pdf";
  } else if (docs.includes(fileExtension) || design.includes(fileExtension) || model.includes(fileExtension) || archive.includes(fileExtension)) {
    kind = "file_url";
    mimeType = "application/octet-stream";
  }
  return {
    kind,
    fileName,
    fileExtension,
    mimeType,
    isDirectFile: Boolean(kind)
  };
}

function detectFileTypeFromFile(file) {
  const fromUrl = detectFileTypeFromUrl(file.name || "");
  const mime = file.type || fromUrl.mimeType || "application/octet-stream";
  let payloadType = "link";
  let recentType = "file";
  if (mime.startsWith("image/")) {
    payloadType = "image";
    recentType = "image";
  } else if (mime.startsWith("video/")) {
    payloadType = "video";
    recentType = "video";
  } else if (mime.startsWith("audio/")) {
    payloadType = "link";
    recentType = "audio";
  } else if (mime === "application/pdf" || fromUrl.kind === "pdf_url") {
    payloadType = "link";
    recentType = "pdf";
  }
  return Object.assign({}, fromUrl, {
    mimeType: mime,
    payloadType,
    recentType
  });
}

function normalizeApiBase(value) {
  return (value || DEFAULT_API_BASE).trim().replace(/\/+$/, "");
}

function fallbackTitle(payload) {
  if (payload.type === "text") return (payload.note || payload.captureContext?.selectionText || "Saved text").slice(0, 54);
  if (payload.type === "image") return payload.captureContext?.method === "extension_snapshot" ? "Snapshot" : "Saved image";
  if (payload.type === "video") return host(payload.sourceUrl || payload.assetUrl || payload.captureContext?.videoUrl || "") || "Saved video";
  return payload.title || host(payload.sourceUrl || payload.captureContext?.linkUrl || payload.captureContext?.pageUrl || "") || "Saved page";
}

function host(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch (_) {
    return "";
  }
}

function isCaptureableUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

function isTinyPreviewUrl(value) {
  if (!value) return false;
  if (/^data:/i.test(value)) return value.length < 120000;
  return /^https?:\/\//i.test(value);
}
