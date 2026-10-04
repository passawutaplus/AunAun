/**
 * Data-subject features (phase 12): export everything a user has in A+ Vault, and delete it.
 * The Supabase project and the login are SHARED with other Aplus apps, so deleting "Vault data" never deletes the auth user:
 * only vault_* rows, Vault storage files, extension captures, digest prefs. (Consent and request records are kept as proof.)
 */
import { eq, serviceRoleKey, supabaseRest, supabaseUrl } from "./supabase-rest.mjs";
import { createZip } from "./zip.mjs";

const FEATURE = "Account data";
const BUCKET = "vault-assets";
export const EXPORT_MAX_BYTES = 40 * 1024 * 1024;

// [table, user column]. Order = delete order (children first are covered by FK cascades; listed for clarity).
export const EXPORT_TABLES = [
  ["vault_items", "user_id"],
  ["vault_item_analysis", "user_id"],
  ["vault_collections", "user_id"],
  ["vault_collection_items", "user_id"],
  ["vault_projects", "user_id"],
  ["vault_boards", "user_id"],
  ["vault_board_objects", "user_id"],
  ["vault_board_shares", "user_id"],
  ["vault_feedback", "user_id"],
  ["vault_extension_captures", "user_id"],
  ["digest_prefs", "user_id"],
  ["consent_events", "user_id"],
  ["dsar_requests", "user_id"],
];
// Tables removed on deletion (consent_events and dsar_requests stay: proof of consent and of how requests were handled).
const DELETE_TABLES = ["vault_extension_captures", "vault_items", "vault_collections", "vault_projects", "vault_boards", "digest_prefs", "vault_feedback"];

async function table(name, column, userId, select = "*") {
  try {
    return (await supabaseRest(`/rest/v1/${name}?select=${select}&${column}=${eq(userId)}&limit=20000`, { feature: FEATURE, errorMessage: `Could not read ${name}.` })) || [];
  } catch (error) {
    if (error.status === 400) return []; // table missing in this environment
    throw error;
  }
}

/** Storage is listed one folder at a time; returns every object path under `${userId}/`. */
export async function listUserFiles(userId, { max = 5000 } = {}) {
  const out = [];
  const queue = [`${userId}`];
  while (queue.length && out.length < max) {
    const prefix = queue.shift();
    const rows = (await supabaseRest(`/storage/v1/object/list/${BUCKET}`, { method: "POST", body: { prefix, limit: 1000, offset: 0 }, feature: FEATURE, errorMessage: "Could not list files." })) || [];
    for (const r of rows) {
      if (r.id === null || r.metadata == null) queue.push(`${prefix}/${r.name}`); // folder
      else out.push(`${prefix}/${r.name}`);
    }
  }
  return out;
}

async function signedUrl(path, seconds = 3600) {
  const res = await supabaseRest(`/storage/v1/object/sign/${BUCKET}/${path}`, { method: "POST", body: { expiresIn: seconds }, feature: FEATURE, errorMessage: "Could not sign file." });
  return res?.signedURL ? `${supabaseUrl()}/storage/v1${res.signedURL}` : null;
}

/** Everything as JSON plus the user's own uploads (up to EXPORT_MAX_BYTES; larger ones are listed with signed links). */
export async function buildExport(userId, { fetchFile = defaultFetchFile } = {}) {
  const files = [];
  const data = {};
  for (const [name, column] of EXPORT_TABLES) {
    data[name] = await table(name, column, userId);
    files.push({ name: `data/${name}.json`, data: JSON.stringify(data[name], null, 2) });
  }
  const paths = await listUserFiles(userId);
  let bytes = 0;
  const skipped = [];
  for (const path of paths) {
    try {
      const url = await signedUrl(path, 24 * 3600);
      const buf = url ? await fetchFile(url) : null;
      if (!buf || bytes + buf.length > EXPORT_MAX_BYTES) { skipped.push({ path, link: url }); continue; }
      bytes += buf.length;
      files.push({ name: `files/${path.slice(String(userId).length + 1)}`, data: buf });
    } catch {
      skipped.push({ path, link: null });
    }
  }
  files.unshift({
    name: "README.txt",
    data: `A+ Vault export for ${userId}\nCreated ${new Date().toISOString()}\n\ndata/*.json  your records (items, collections, projects, moodboards, requests, consent log)\nfiles/       your own uploaded files\n${skipped.length ? `\nfiles/skipped.json lists ${skipped.length} files that were too large; links work for 24 hours.\n` : ""}`,
  });
  if (skipped.length) files.push({ name: "files/skipped.json", data: JSON.stringify(skipped, null, 2) });
  return { zip: createZip(files), counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])), fileCount: paths.length - skipped.length, skipped: skipped.length };
}

async function defaultFetchFile(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("download failed");
  return Buffer.from(await res.arrayBuffer());
}

/** Upload the export zip into the user's own folder and return a one-hour signed link. */
export async function storeExport(userId, zip) {
  const path = `${userId}/exports/vault-export-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
  await supabaseRest(`/storage/v1/object/${BUCKET}/${path}`, { method: "POST", body: zip, headers: { "content-type": "application/zip", "x-upsert": "true" }, feature: FEATURE, errorMessage: "Could not store the export." });
  return { path, url: await signedUrl(path, 3600) };
}

/** Remove the user's Vault data. Returns counts. The auth user is NOT deleted (shared with other Aplus apps). */
export async function deleteVaultData(userId) {
  const deleted = { files: 0 };
  const paths = await listUserFiles(userId);
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    await supabaseRest(`/storage/v1/object/${BUCKET}`, { method: "DELETE", body: { prefixes: batch }, feature: FEATURE, errorMessage: "Could not delete files." });
    deleted.files += batch.length;
  }
  for (const name of DELETE_TABLES) {
    try {
      const rows = await supabaseRest(`/rest/v1/${name}?user_id=${eq(userId)}`, { method: "DELETE", prefer: "return=representation", feature: FEATURE, errorMessage: `Could not delete ${name}.` });
      deleted[name] = Array.isArray(rows) ? rows.length : 0;
    } catch (error) {
      if (error.status !== 400) throw error;
      deleted[name] = 0;
    }
  }
  return deleted;
}

export { serviceRoleKey };
