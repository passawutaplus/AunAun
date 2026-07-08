import { hashBearer, scopeHashFromAuth } from "./vault-api-auth.mjs";

const DEFAULT_SUPABASE_URL = "https://zkflkpbmbozrchqncpzi.supabase.co";
const STORAGE_BUCKET = "vault-assets";

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VAULT_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VAULT_SUPABASE_SERVICE_ROLE_KEY || "";
  if (!key) throw new Error("Capture API storage is not configured on the server.");
  return { url, key };
}

function restHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

function mapRow(row) {
  return {
    objectId: row.object_id,
    item: row.item,
    payload: row.payload,
    createdAt: row.created_at
  };
}

export async function readCaptures(auth) {
  const { url, key } = supabaseConfig();
  const scope = scopeHashFromAuth(auth);
  if (!scope) return [];

  const response = await fetch(
    `${url}/rest/v1/vault_extension_captures?select=object_id,item,payload,created_at&bearer_hash=eq.${encodeURIComponent(scope)}&order=created_at.desc&limit=500`,
    { headers: restHeaders(key, { accept: "application/json" }) }
  );
  const text = await response.text();
  const rows = text ? JSON.parse(text) : [];
  if (!response.ok) {
    throw new Error(rows?.message || rows?.error || "Could not load extension captures.");
  }
  return (Array.isArray(rows) ? rows : []).map(mapRow);
}

export async function writeCapture(record, auth) {
  const { url, key } = supabaseConfig();
  const scope = scopeHashFromAuth(auth);
  if (!scope) throw new Error("Missing capture scope.");

  const response = await fetch(`${url}/rest/v1/vault_extension_captures`, {
    method: "POST",
    headers: restHeaders(key, {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify({
      object_id: record.objectId,
      bearer_hash: scope,
      user_id: auth?.userId || null,
      item: record.item,
      payload: record.payload || null
    })
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Could not save extension capture.");
  }
  return data;
}

export async function findDuplicateCaptureRemote(item, auth) {
  const rows = await readCaptures(auth);
  const keys = duplicateKeys(item);
  if (!keys.length) return null;
  return rows.find(row => {
    const existing = row?.item || row;
    return duplicateKeys(existing).some(key => keys.includes(key));
  }) || null;
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
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    return parsed.href;
  } catch {
    return raw;
  }
}

export async function uploadCaptureFile(buffer, contentType, objectId, extension = "png") {
  const { url, key } = supabaseConfig();
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  const path = `extension-captures/${objectId}.${safeExt}`;
  const upload = await fetch(`${url}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: restHeaders(key, {
      "content-type": contentType || "image/png",
      "x-upsert": "true"
    }),
    body: buffer
  });
  if (!upload.ok) {
    const err = await upload.text();
    let message = "Could not upload capture file.";
    try {
      message = JSON.parse(err)?.message || message;
    } catch {}
    throw new Error(message);
  }

  const signed = await fetch(`${url}/storage/v1/object/sign/${STORAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: restHeaders(key, { "content-type": "application/json" }),
    body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 7 })
  });
  const signedData = await signed.json();
  if (!signed.ok || !signedData?.signedURL) {
    throw new Error("Could not create signed URL for capture file.");
  }
  return `${url}/storage/v1${signedData.signedURL}`;
}

export function storageConfigured() {
  try {
    supabaseConfig();
    return true;
  } catch {
    return false;
  }
}

export { hashBearer };
