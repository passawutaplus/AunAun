let snapshotState = null;
let latestVaultContext = null;

const VAULT_SYNC_HOSTS = /^(localhost|127\.0\.0\.1|aplus-vault\.vercel\.app|aplus-vault-demo\.vercel\.app)$/i;

window.addEventListener("message", event => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.type !== "VAULT_EXTENSION_COLLECTIONS") return;
  if (!VAULT_SYNC_HOSTS.test(location.hostname)) return;
  try {
    chrome.runtime.sendMessage({
      type: "VAULT_SYNC_COLLECTIONS",
      collections: Array.isArray(data.collections) ? data.collections : []
    });
  } catch (_) {}
}, false);

window.addEventListener("contextmenu", event => {
  latestVaultContext = buildVaultContextFromPoint(event.clientX, event.clientY);
  try {
    chrome.runtime.sendMessage({
      type: "VAULT_CONTEXT_CAPTURED",
      context: latestVaultContext
    });
  } catch (_) {}
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "VAULT_PING") {
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "VAULT_START_SNAPSHOT") {
    startSnapshotOverlay();
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "GET_LATEST_VAULT_CONTEXT") {
    sendResponse({ ok: true, context: latestVaultContext || buildVaultContextFromPoint(window.innerWidth / 2, window.innerHeight / 2) });
    return true;
  }

  if (message?.type === "VAULT_CROP_SNAPSHOT") {
    cropSnapshot(message)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ ok: false, error: error.message || "Crop failed." }));
    return true;
  }

  if (message?.type === "VAULT_TOAST") {
    showVaultToast(message.message, message.kind);
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

function buildVaultContextFromPoint(x, y) {
  const elements = document.elementsFromPoint(Math.max(0, x), Math.max(0, y));
  const pageMeta = extractPageMetadata();
  const candidates = [];
  const seen = new Set();

  elements.forEach(element => {
    [
      extractImageCandidate(element),
      extractPictureCandidate(element),
      extractBackgroundImageCandidate(element),
      extractVideoCandidate(element),
      extractAudioCandidate(element),
      extractLinkCandidate(element)
    ].forEach(candidate => pushCandidate(candidates, seen, candidate));
  });

  pageMeta.candidates.forEach(candidate => pushCandidate(candidates, seen, candidate));

  return {
    x,
    y,
    pageUrl: location.href,
    pageTitle: document.title || pageMeta.title || "",
    domain: location.hostname,
    pageMeta,
    candidates
  };
}

function pushCandidate(candidates, seen, candidate) {
  if (!candidate) return;
  const key = [candidate.kind, candidate.sourceUrl, candidate.assetUrl, candidate.previewUrl].filter(Boolean).join("|");
  if (seen.has(key)) return;
  seen.add(key);
  candidates.push(candidate);
}

function extractImageCandidate(element) {
  const image = element?.tagName?.toLowerCase() === "img" ? element : element?.closest?.("img");
  if (!image) return null;
  const assetUrl = absoluteUrl(image.currentSrc || image.src || getBestSrcFromSrcset(image.srcset));
  if (!assetUrl) return null;
  const rect = rectForElement(image);
  return {
    kind: "image",
    title: image.alt || document.title || "Saved image",
    sourceUrl: location.href,
    assetUrl,
    previewUrl: assetUrl,
    thumbnailUrl: assetUrl,
    pageUrl: location.href,
    pageTitle: document.title,
    domain: location.hostname,
    confidence: 0.95,
    captureContext: {
      method: "extension_dom_media",
      clickedElementTag: "img",
      imageAlt: image.alt || null,
      imageUrl: assetUrl,
      rect
    }
  };
}

function extractPictureCandidate(element) {
  const picture = element?.closest?.("picture");
  if (!picture) return null;
  const image = picture.querySelector("img");
  const source = Array.from(picture.querySelectorAll("source")).map(item => getBestSrcFromSrcset(item.srcset)).filter(Boolean).pop();
  const assetUrl = absoluteUrl(image?.currentSrc || image?.src || source);
  if (!assetUrl) return null;
  const rect = rectForElement(image || picture);
  return {
    kind: "image",
    title: image?.alt || document.title || "Saved image",
    sourceUrl: location.href,
    assetUrl,
    previewUrl: assetUrl,
    thumbnailUrl: assetUrl,
    pageUrl: location.href,
    pageTitle: document.title,
    domain: location.hostname,
    confidence: 0.92,
    captureContext: {
      method: "extension_dom_media",
      clickedElementTag: "picture",
      imageAlt: image?.alt || null,
      imageUrl: assetUrl,
      rect
    }
  };
}

function extractBackgroundImageCandidate(element) {
  const backgroundUrl = getBackgroundImageUrl(element);
  if (!backgroundUrl) return null;
  const assetUrl = absoluteUrl(backgroundUrl);
  if (!assetUrl) return null;
  const rect = rectForElement(element);
  return {
    kind: "background_image",
    title: element?.getAttribute?.("aria-label") || element?.textContent?.trim()?.slice(0, 90) || document.title || "Background image",
    sourceUrl: location.href,
    assetUrl,
    previewUrl: assetUrl,
    thumbnailUrl: assetUrl,
    pageUrl: location.href,
    pageTitle: document.title,
    domain: location.hostname,
    confidence: 0.75,
    captureContext: {
      method: "extension_background_image",
      clickedElementTag: element?.tagName?.toLowerCase() || null,
      backgroundImageUrl: assetUrl,
      rect
    }
  };
}

function extractVideoCandidate(element) {
  const video = element?.tagName?.toLowerCase() === "video" ? element : element?.closest?.("video");
  if (!video) return null;
  const assetUrl = absoluteUrl(video.currentSrc || video.src);
  const poster = absoluteUrl(video.poster);
  if (!assetUrl && !poster) return null;
  return {
    kind: "video",
    title: video.getAttribute("aria-label") || document.title || "Saved video",
    sourceUrl: location.href,
    assetUrl,
    previewUrl: poster,
    thumbnailUrl: poster,
    pageUrl: location.href,
    pageTitle: document.title,
    domain: location.hostname,
    confidence: poster ? 0.7 : 0.55,
    captureContext: {
      method: "extension_video",
      clickedElementTag: "video",
      videoPosterUrl: poster,
      videoUrl: assetUrl,
      rect: rectForElement(video)
    }
  };
}

function extractAudioCandidate(element) {
  const audio = element?.tagName?.toLowerCase() === "audio" ? element : element?.closest?.("audio");
  if (!audio) return null;
  const assetUrl = absoluteUrl(audio.currentSrc || audio.src);
  if (!assetUrl) return null;
  return {
    kind: "audio",
    title: document.title || "Saved audio",
    sourceUrl: location.href,
    assetUrl,
    previewUrl: null,
    thumbnailUrl: null,
    pageUrl: location.href,
    pageTitle: document.title,
    domain: location.hostname,
    confidence: 0.52,
    captureContext: {
      method: "extension_audio",
      clickedElementTag: "audio",
      audioUrl: assetUrl,
      rect: rectForElement(audio)
    }
  };
}

function extractLinkCandidate(element) {
  const link = element?.closest?.("a[href]");
  if (!link) return null;
  const href = absoluteUrl(link.getAttribute("href"));
  if (!href) return null;
  const fileInfo = detectFileTypeFromUrl(href);
  return {
    kind: fileInfo.kind || "link",
    title: link.textContent?.trim()?.slice(0, 120) || document.title || "Saved link",
    sourceUrl: href,
    assetUrl: fileInfo.isDirectFile ? href : null,
    previewUrl: null,
    thumbnailUrl: null,
    pageUrl: location.href,
    pageTitle: document.title,
    domain: host(href),
    mimeType: fileInfo.mimeType,
    fileName: fileInfo.fileName,
    fileExtension: fileInfo.fileExtension,
    confidence: fileInfo.isDirectFile ? 0.6 : 0.45,
    captureContext: {
      method: fileInfo.isDirectFile ? "extension_file_url" : "extension_link",
      clickedElementTag: element?.tagName?.toLowerCase() || null,
      clickedText: link.textContent?.trim()?.slice(0, 180) || null,
      linkUrl: href,
      rect: rectForElement(link)
    }
  };
}

function extractPageMetadata() {
  const ogImage = absoluteUrl(metaContent('meta[property="og:image"]'));
  const twitterImage = absoluteUrl(metaContent('meta[name="twitter:image"]'));
  const canonical = absoluteUrl(document.querySelector('link[rel="canonical"]')?.getAttribute("href")) || location.href;
  const title = metaContent('meta[property="og:title"]') || metaContent('meta[name="twitter:title"]') || document.title || "";
  const description = metaContent('meta[property="og:description"]') || metaContent('meta[name="description"]') || metaContent('meta[name="twitter:description"]') || "";
  const favicon = absoluteUrl(document.querySelector('link[rel="icon"]')?.getAttribute("href") || document.querySelector('link[rel="shortcut icon"]')?.getAttribute("href"));
  const candidates = [];

  if (ogImage) {
    candidates.push({
      kind: "page",
      title,
      sourceUrl: canonical,
      assetUrl: null,
      previewUrl: ogImage,
      thumbnailUrl: ogImage,
      pageUrl: location.href,
      pageTitle: document.title,
      domain: location.hostname,
      confidence: 0.65,
      captureContext: {
        method: "extension_page",
        ogImage,
        twitterImage,
        canonicalUrl: canonical
      }
    });
  }

  if (twitterImage && twitterImage !== ogImage) {
    candidates.push({
      kind: "page",
      title,
      sourceUrl: canonical,
      assetUrl: null,
      previewUrl: twitterImage,
      thumbnailUrl: twitterImage,
      pageUrl: location.href,
      pageTitle: document.title,
      domain: location.hostname,
      confidence: 0.62,
      captureContext: {
        method: "extension_page",
        ogImage,
        twitterImage,
        canonicalUrl: canonical
      }
    });
  }

  return {
    title,
    description,
    sourceUrl: canonical,
    pageUrl: location.href,
    domain: location.hostname,
    ogImage,
    twitterImage,
    favicon,
    candidates
  };
}

function getBestSrcFromSrcset(srcset) {
  if (!srcset) return "";
  return srcset.split(",").map(part => part.trim().split(/\s+/)[0]).filter(Boolean).pop() || "";
}

function getBackgroundImageUrl(element) {
  if (!element || element.nodeType !== 1) return "";
  const background = window.getComputedStyle(element).backgroundImage;
  if (!background || background === "none") return "";
  const match = background.match(/url\(["']?(.*?)["']?\)/);
  return match?.[1] || "";
}

function detectFileTypeFromUrl(value) {
  let pathname = "";
  try {
    pathname = new URL(value).pathname;
  } catch (_) {
    pathname = value || "";
  }
  const fileName = decodeURIComponent(pathname.split("/").pop() || "");
  const fileExtension = (fileName.split(".").pop() || "").toLowerCase();
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

function metaContent(selector) {
  return document.querySelector(selector)?.getAttribute("content") || "";
}

function absoluteUrl(value) {
  if (!value) return "";
  try {
    return new URL(value, document.baseURI).href;
  } catch (_) {
    return "";
  }
}

function host(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch (_) {
    return "";
  }
}

function rectForElement(element) {
  if (!element?.getBoundingClientRect) return null;
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function startSnapshotOverlay() {
  cleanupSnapshotOverlay();

  const overlay = document.createElement("div");
  overlay.className = "aplus-vault-snapshot-overlay";
  overlay.innerHTML = `
    <div class="aplus-vault-snapshot-dim"></div>
    <div class="aplus-vault-snapshot-helper">Drag to capture - Esc to cancel</div>
    <div class="aplus-vault-snapshot-rect" hidden>
      <span></span>
    </div>
  `;

  const style = document.createElement("style");
  style.className = "aplus-vault-snapshot-style";
  const vaultFontUrl = chrome.runtime.getURL("fonts/Agrandir-Wide-Light.woff2");
  style.textContent = `
    @font-face {
      font-family: "Agrandir Wide";
      src:
        url("${vaultFontUrl}") format("woff2"),
        local("Agrandir Wide Light"),
        local("Agrandir Wide"),
        local("Agrandir Wide Regular"),
        local("AgrandirWide-Regular"),
        local("Agrandir-Wide");
      font-weight: 300;
      font-style: normal;
      font-display: swap;
    }
    .aplus-vault-snapshot-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      cursor: crosshair;
      user-select: none;
      font-family: "Agrandir Wide", "Agrandir", "IBM Plex Sans Thai", "IBM Plex Sans", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .aplus-vault-snapshot-dim {
      position: absolute;
      inset: 0;
      background: rgba(10, 12, 14, .36);
    }
    .aplus-vault-snapshot-helper {
      position: absolute;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      padding: 9px 13px;
      border-radius: 999px;
      color: #fff;
      background: rgba(17, 19, 21, .86);
      box-shadow: 0 12px 32px rgba(0, 0, 0, .18);
      font-size: 13px;
      font-weight: 400;
      letter-spacing: 0;
      pointer-events: none;
    }
    .aplus-vault-snapshot-rect {
      position: absolute;
      border: 2px solid #ff4f43;
      background: rgba(255, 79, 67, .08);
      box-shadow: 0 0 0 9999px rgba(10, 12, 14, .48);
      border-radius: 8px;
      pointer-events: none;
    }
    .aplus-vault-snapshot-rect span {
      position: absolute;
      right: 8px;
      bottom: 8px;
      padding: 4px 7px;
      border-radius: 999px;
      color: #fff;
      background: rgba(17, 19, 21, .86);
      font-size: 11px;
      font-weight: 400;
    }
    .aplus-vault-toast {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 2147483647;
      max-width: min(320px, calc(100vw - 36px));
      padding: 12px 14px;
      border-radius: 14px;
      color: #fff;
      background: #17191b;
      box-shadow: 0 16px 42px rgba(0, 0, 0, .22);
      font: 400 13px/1.35 "Agrandir Wide", "Agrandir", "IBM Plex Sans Thai", "IBM Plex Sans", Inter, ui-sans-serif, system-ui, sans-serif;
      animation: aplusVaultToastIn .18s ease-out;
    }
    .aplus-vault-toast.success { background: #2c8f68; }
    .aplus-vault-toast.error { background: #cc3931; }
    @keyframes aplusVaultToastIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  document.documentElement.appendChild(style);
  document.documentElement.appendChild(overlay);

  const rectEl = overlay.querySelector(".aplus-vault-snapshot-rect");
  const sizeEl = rectEl.querySelector("span");

  snapshotState = {
    overlay,
    style,
    rectEl,
    sizeEl,
    dragging: false,
    startX: 0,
    startY: 0
  };

  overlay.addEventListener("mousedown", onSnapshotMouseDown, true);
  overlay.addEventListener("mousemove", onSnapshotMouseMove, true);
  overlay.addEventListener("mouseup", onSnapshotMouseUp, true);
  window.addEventListener("keydown", onSnapshotKeyDown, true);
}

function onSnapshotMouseDown(event) {
  if (!snapshotState) return;
  event.preventDefault();
  snapshotState.dragging = true;
  snapshotState.startX = event.clientX;
  snapshotState.startY = event.clientY;
  updateSnapshotRect(event.clientX, event.clientY);
}

function onSnapshotMouseMove(event) {
  if (!snapshotState?.dragging) return;
  event.preventDefault();
  updateSnapshotRect(event.clientX, event.clientY);
}

function onSnapshotMouseUp(event) {
  if (!snapshotState?.dragging) return;
  event.preventDefault();
  const rect = getSnapshotRect(event.clientX, event.clientY);
  cleanupSnapshotOverlay();

  if (rect.width < 8 || rect.height < 8) {
    showVaultToast("Snapshot cancelled.", "error");
    return;
  }

  chrome.runtime.sendMessage({
    type: "VAULT_SNAPSHOT_RECT",
    rect,
    devicePixelRatio: window.devicePixelRatio || 1,
    pageTitle: document.title || null,
    pageUrl: location.href
  });
}

function onSnapshotKeyDown(event) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  cleanupSnapshotOverlay();
}

function updateSnapshotRect(currentX, currentY) {
  const rect = getSnapshotRect(currentX, currentY);
  snapshotState.rectEl.hidden = false;
  snapshotState.rectEl.style.left = `${rect.x}px`;
  snapshotState.rectEl.style.top = `${rect.y}px`;
  snapshotState.rectEl.style.width = `${rect.width}px`;
  snapshotState.rectEl.style.height = `${rect.height}px`;
  snapshotState.sizeEl.textContent = `${Math.round(rect.width)} x ${Math.round(rect.height)}`;
}

function getSnapshotRect(currentX, currentY) {
  const x = Math.max(0, Math.min(snapshotState.startX, currentX));
  const y = Math.max(0, Math.min(snapshotState.startY, currentY));
  const right = Math.min(window.innerWidth, Math.max(snapshotState.startX, currentX));
  const bottom = Math.min(window.innerHeight, Math.max(snapshotState.startY, currentY));
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y)
  };
}

function cleanupSnapshotOverlay() {
  if (!snapshotState) return;
  snapshotState.overlay.remove();
  snapshotState.style.remove();
  window.removeEventListener("keydown", onSnapshotKeyDown, true);
  snapshotState = null;
}

async function cropSnapshot(message) {
  const image = await loadImage(message.screenshotDataUrl);
  const dpr = Number(message.devicePixelRatio) || 1;
  const rect = message.rect || {};
  const sx = Math.round((Number(rect.x) || 0) * dpr);
  const sy = Math.round((Number(rect.y) || 0) * dpr);
  const sw = Math.max(1, Math.round((Number(rect.width) || 1) * dpr));
  const sh = Math.max(1, Math.round((Number(rect.height) || 1) * dpr));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return { ok: true, dataUrl: canvas.toDataURL("image/jpeg", 0.92) };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed."));
    image.src = src;
  });
}

function showVaultToast(message, kind = "default") {
  const existing = document.querySelector(".aplus-vault-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = `aplus-vault-toast ${kind || ""}`;
  toast.textContent = message || "Saved to Vault Library";
  document.documentElement.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}
