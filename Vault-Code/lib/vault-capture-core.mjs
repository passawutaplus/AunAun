export function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanUrl(value) {
  const raw = text(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["http:", "https:", "data:", "blob:"].includes(url.protocol)) return "";
    return raw;
  } catch {
    return raw.startsWith("upload://") ? raw : "";
  }
}

function host(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function inferColors(seed) {
  const value = seed.toLowerCase();
  if (value.includes("coral") || value.includes("red")) return ["#ff4f43", "#2f3133", "#ffffff"];
  if (value.includes("interior") || value.includes("material")) return ["#d6c7b7", "#f8f6f2", "#9aa5a7", "#c56b4e"];
  if (value.includes("black") || value.includes("dark")) return ["#17191b", "#2f3133", "#ffffff"];
  return ["#ffffff", "#2f3133", "#ff4f43", "#e7e9ec"];
}

function quickTagsFrom(value) {
  return text(value)
    .split(/[,\n]/)
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function analyzeLite(item, rawType) {
  const sourceHost = host(item.sourceUrl);
  const context = item.captureContext || {};
  const quickTags = Array.isArray(context.quickTags) ? context.quickTags : [];
  const tags = new Set([item.type === "note" ? "thought" : item.type, "extension capture"]);
  if (rawType === "page") tags.add("saved page");
  if (rawType === "text") tags.add("selected text");
  if (rawType === "video") tags.add("motion reference");
  if (sourceHost) tags.add(sourceHost);
  quickTags.forEach(tag => tags.add(tag));
  if (context.visualCategory) tags.add(context.visualCategory);
  return {
    tags: Array.from(tags).slice(0, 8),
    category: context.visualCategory || "",
    colors: inferColors(`${item.title} ${item.note} ${item.sourceUrl}`).slice(0, 5),
    ocrText: item.type === "note"
      ? item.note
      : rawType === "image"
        ? "Image captured from browser extension."
        : rawType === "video"
          ? "Video metadata captured from browser extension."
          : "Metadata captured from browser extension.",
    summary: item.type === "image"
      ? "Image reference kept from the browser extension."
      : item.type === "video"
        ? "Video reference kept from the browser extension for motion and mood direction."
        : item.type === "link"
          ? `Saved source${sourceHost ? ` from ${sourceHost}` : ""} via browser extension.`
          : "Selected text kept from the browser extension."
  };
}

export function buildVaultItem(payload) {
  const context = payload.captureContext && typeof payload.captureContext === "object"
    ? payload.captureContext
    : {};
  const rawType = text(payload.type).toLowerCase();
  const type = rawType === "image" ? "image" : rawType === "video" ? "video" : rawType === "link" || rawType === "page" ? "link" : "note";
  const pageTitle = text(context.pageTitle);
  const pageUrl = cleanUrl(context.pageUrl);
  const sourceUrl = cleanUrl(payload.sourceUrl) || pageUrl || cleanUrl(context.linkUrl) || cleanUrl(context.videoUrl);
  const previewUrl = cleanUrl(payload.previewUrl) || cleanUrl(payload.thumbnailUrl) || cleanUrl(context.imageUrl) || cleanUrl(context.ogImage) || cleanUrl(context.twitterImage);
  const thumbnailUrl = cleanUrl(payload.thumbnailUrl) || previewUrl;
  const assetUrl = type === "image"
    ? cleanUrl(payload.assetUrl) || cleanUrl(context.imageUrl) || previewUrl
    : type === "video"
      ? cleanUrl(payload.assetUrl) || cleanUrl(context.videoUrl) || sourceUrl
      : cleanUrl(payload.assetUrl) || "";
  const note = type === "note"
    ? text(payload.note) || text(context.selectionText)
    : text(payload.note);
  let title = text(payload.title);
  if (!title && rawType === "text") title = note.slice(0, 54) || "Saved text";
  if (!title && rawType === "page") title = pageTitle || host(sourceUrl) || "Saved page";
  if (!title && type === "link") title = host(sourceUrl) || "Saved link";
  if (!title && type === "image") title = pageTitle || "Saved image";
  if (!title && type === "video") title = pageTitle || host(sourceUrl) || "Saved video";
  const requestedCollection = text(payload.collectionId);
  const quickTags = quickTagsFrom(payload.quickKeywords || context.quickKeywords);
  const visualCategory = text(payload.visualCategory || context.visualCategory);

  const item = {
    id: makeId(),
    type,
    title,
    note,
    sourceUrl,
    assetUrl,
    previewUrl,
    thumbnailUrl,
    mimeType: text(payload.mimeType),
    fileName: text(payload.fileName),
    fileExtension: text(payload.fileExtension),
    collectionIds: [requestedCollection || "all"],
    projectIds: text(payload.projectId) ? [text(payload.projectId)] : [],
    status: "ready",
    createdAt: Date.now(),
    captureContext: {
      method: text(context.method) || `extension_${rawType || type}`,
      pageTitle: pageTitle || null,
      pageUrl: pageUrl || null,
      selectionText: text(context.selectionText) || null,
      imageUrl: cleanUrl(context.imageUrl) || (type === "image" ? assetUrl : null),
      videoUrl: cleanUrl(context.videoUrl) || (type === "video" ? assetUrl : null),
      linkUrl: cleanUrl(context.linkUrl) || sourceUrl || null,
      previewUrl: previewUrl || null,
      thumbnailUrl: thumbnailUrl || null,
      mimeType: text(payload.mimeType) || null,
      fileName: text(payload.fileName) || null,
      fileExtension: text(payload.fileExtension) || null,
      destination: "Vault Library",
      rawType: rawType || type,
      quickTags,
      visualCategory: visualCategory || null,
      usageNote: text(context.usageNote) || "Private reference only",
      collectionName: text(context.collectionName) || text(payload.collectionName) || null
    }
  };
  item.analysis = analyzeLite(item, rawType);
  return item;
}

function canonicalRef(value) {
  const raw = text(value);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    return parsed.href;
  } catch {
    return raw;
  }
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

export function findDuplicateCapture(item, rows) {
  const keys = duplicateKeys(item);
  if (!keys.length) return null;
  return (rows || []).find(row => {
    const existing = row?.item || row;
    return duplicateKeys(existing).some(key => keys.includes(key));
  }) || null;
}

export function parseMultipart(buffer, contentType) {
  const match = /boundary=([^;]+)/i.exec(contentType || "");
  if (!match) throw new Error("Missing multipart boundary.");
  const boundary = `--${match[1].replace(/^"|"$/g, "")}`;
  const textBody = buffer.toString("latin1");
  const parts = textBody.split(boundary).slice(1, -1);
  const result = {};

  parts.forEach(part => {
    const trimmed = part.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const splitIndex = trimmed.indexOf("\r\n\r\n");
    if (splitIndex < 0) return;
    const headerBlock = trimmed.slice(0, splitIndex);
    const body = trimmed.slice(splitIndex + 4).replace(/\r\n$/, "");
    const nameMatch = /name="([^"]+)"/.exec(headerBlock);
    if (!nameMatch) return;
    const name = nameMatch[1];
    const filenameMatch = /filename="([^"]*)"/.exec(headerBlock);
    const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headerBlock);
    const valueBuffer = Buffer.from(body, "latin1");

    if (filenameMatch) {
      result[name] = {
        filename: filenameMatch[1],
        contentType: typeMatch ? typeMatch[1].trim() : "application/octet-stream",
        buffer: valueBuffer
      };
      return;
    }

    result[name] = valueBuffer.toString("utf8");
  });

  return result;
}

export function buildCaptureResponse(item, duplicate, payloadOverride) {
  const previewUrl = item.previewUrl || item.assetUrl || null;
  return {
    success: true,
    duplicateOf: duplicate ? duplicate.objectId || duplicate.item?.id || null : null,
    objectId: item.id,
    type: item.type,
    title: item.title,
    sourceUrl: item.sourceUrl,
    previewUrl: previewUrl && String(previewUrl).length < 120000 ? previewUrl : null,
    thumbnailUrl: item.thumbnailUrl || previewUrl,
    objectUrl: `/vault#object=${encodeURIComponent(item.id)}`,
    createdAt: new Date(item.createdAt).toISOString(),
    message: "Saved to Vault Library",
    item,
    payload: payloadOverride
  };
}
