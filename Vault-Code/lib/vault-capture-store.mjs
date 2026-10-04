import { scopeHashFromAuth } from "./vault-api-auth.mjs";
import { dedupeKeys } from "./vault-capture-core.mjs";
import { eq, supabaseRest, supabaseUrl } from "./supabase-rest.mjs";

const STORAGE_BUCKET = "vault-assets";
const FEATURE = "Capture API storage";
export const CAPTURES_DEFAULT_LIMIT = 100;
export const CAPTURES_MAX_LIMIT = 500;

function requireScope(auth) {
  const scope = scopeHashFromAuth(auth);
  if (!scope) throw new Error("Missing capture scope.");
  return scope;
}

/** Newest captures for one scope; only `item` is returned (the raw payload stays server-side). */
export async function readCaptures(auth, { limit = CAPTURES_DEFAULT_LIMIT } = {}) {
  const scope = scopeHashFromAuth(auth);
  if (!scope) return [];
  const safeLimit = Math.max(1, Math.min(CAPTURES_MAX_LIMIT, Number(limit) || CAPTURES_DEFAULT_LIMIT));
  const rows = await supabaseRest(
    `/rest/v1/vault_extension_captures?select=object_id,item,created_at&bearer_hash=${eq(scope)}&order=created_at.desc&limit=${safeLimit}`,
    { feature: FEATURE, errorMessage: "Could not load extension captures." }
  );
  return (Array.isArray(rows) ? rows : []).map(row => ({ objectId: row.object_id, item: row.item, createdAt: row.created_at }));
}

function postgrestArray(values) {
  return `{${values.map(v => `"${String(v).replace(/["\\]/g, m => `\\${m}`)}"`).join(",")}}`;
}

/** Uses the GIN index on `dedupe_keys` instead of scanning recent captures. */
export async function findDuplicateCapture(item, auth) {
  const keys = dedupeKeys(item);
  const scope = scopeHashFromAuth(auth);
  if (!keys.length || !scope) return null;
  const rows = await supabaseRest(
    `/rest/v1/vault_extension_captures?select=object_id&bearer_hash=${eq(scope)}&dedupe_keys=ov.${encodeURIComponent(postgrestArray(keys))}&order=created_at.desc&limit=1`,
    { feature: FEATURE, errorMessage: "Could not check for duplicates." }
  );
  return Array.isArray(rows) && rows[0] ? { objectId: rows[0].object_id } : null;
}

export async function writeCapture(record, auth) {
  await supabaseRest("/rest/v1/vault_extension_captures", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    feature: FEATURE,
    errorMessage: "Could not save extension capture.",
    body: {
      object_id: record.objectId,
      bearer_hash: requireScope(auth),
      user_id: auth?.userId || null,
      item: record.item,
      payload: record.payload || null,
      dedupe_keys: dedupeKeys(record.item)
    }
  });
}

/** Stored under the user's folder so the web app can re-sign it with the user's own session. */
export async function uploadCaptureFile(buffer, contentType, objectId, extension, userId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(userId || ""))) throw new Error("Missing capture owner.");
  const safeExt = String(extension || "").replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const safeId = String(objectId || "").replace(/[^a-z0-9]/gi, "") || Date.now().toString(36);
  const path = `${String(userId).toLowerCase()}/extension-captures/${safeId}.${safeExt}`;

  await supabaseRest(`/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    method: "POST",
    body: buffer,
    headers: { "content-type": contentType || "application/octet-stream", "x-upsert": "true" },
    feature: FEATURE,
    errorMessage: "Could not upload capture file."
  });
  const signed = await supabaseRest(`/storage/v1/object/sign/${STORAGE_BUCKET}/${path}`, {
    method: "POST",
    body: { expiresIn: 60 * 60 * 24 * 7 },
    feature: FEATURE,
    errorMessage: "Could not create signed URL for capture file."
  });
  if (!signed?.signedURL) throw new Error("Could not create signed URL for capture file.");
  return { path, signedUrl: `${supabaseUrl()}/storage/v1${signed.signedURL}` };
}

/** One capture's `item` for this scope (used by enrichment). */
export async function readCaptureItem(objectId, auth) {
  const scope = scopeHashFromAuth(auth);
  if (!scope || !objectId) return null;
  const rows = await supabaseRest(
    `/rest/v1/vault_extension_captures?select=item&object_id=${eq(objectId)}&bearer_hash=${eq(scope)}&limit=1`,
    { feature: FEATURE, errorMessage: "Could not load this capture." }
  );
  return Array.isArray(rows) && rows[0] ? rows[0].item : null;
}

/** Replaces the stored `item` (enrichment writes `item.analysis`; everything else is passed through unchanged). */
export async function writeCaptureItem(objectId, item, auth) {
  const scope = requireScope(auth);
  await supabaseRest(`/rest/v1/vault_extension_captures?object_id=${eq(objectId)}&bearer_hash=${eq(scope)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    feature: FEATURE,
    errorMessage: "Could not save enrichment.",
    body: { item }
  });
}
