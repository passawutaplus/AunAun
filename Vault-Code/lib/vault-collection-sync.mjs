import { scopeHashFromAuth } from "./vault-api-auth.mjs";
import { eq, supabaseRest } from "./supabase-rest.mjs";

const FEATURE = "Collection sync API";
const MAX_COLLECTIONS = 500;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toCollection(row) {
  if (!row || row.system) return null;
  const id = text(row.client_key) || text(row.id);
  const name = text(row.name);
  if (!id || !name || id === "all") return null;
  return { id, name, system: false };
}

function readUserCollections(userId) {
  return supabaseRest(
    `/rest/v1/vault_collections?select=id,client_key,name,system&user_id=${eq(userId)}&system=eq.false&order=created_at.asc&limit=${MAX_COLLECTIONS}`,
    { feature: FEATURE, errorMessage: "Could not load Vault collections." }
  );
}

function readScopeCollections(scope) {
  return supabaseRest(
    `/rest/v1/vault_extension_collections?select=client_key,name&bearer_hash=${eq(scope)}&order=created_at.asc&limit=${MAX_COLLECTIONS}`,
    { feature: FEATURE, errorMessage: "Could not load extension collections." }
  );
}

/** User collections win; extension-only collections fill in. Both reads run in parallel. */
export async function readExtensionCollections(auth) {
  const scope = scopeHashFromAuth(auth);
  const [userRows, scopeRows] = await Promise.all([
    auth?.userId ? readUserCollections(auth.userId) : [],
    scope ? readScopeCollections(scope) : [],
  ]);
  const byId = new Map();
  [...(userRows || []), ...(scopeRows || [])].forEach(row => {
    const collection = toCollection(row);
    if (collection && !byId.has(collection.id)) byId.set(collection.id, collection);
  });
  return Array.from(byId.values());
}

/** Single upsert per call, backed by unique (user_id, client_key) / (bearer_hash, client_key). */
export async function upsertExtensionCollection(auth, payload) {
  const name = text(payload?.name).slice(0, 120);
  const clientKey = text(payload?.id) || text(payload?.clientKey);
  if (!name) throw new Error("Collection name is required.");
  if (!clientKey || clientKey === "all" || clientKey.length > 120) throw new Error("Collection id is required.");

  if (auth?.userId) {
    const rows = await supabaseRest("/rest/v1/vault_collections?on_conflict=user_id,client_key", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      feature: FEATURE,
      errorMessage: "Could not save Vault collection.",
      body: { user_id: auth.userId, name, system: false, client_key: clientKey, metadata: { localId: clientKey } }
    });
    return toCollection(Array.isArray(rows) ? rows[0] : rows) || { id: clientKey, name, system: false };
  }

  const scope = scopeHashFromAuth(auth);
  if (!scope) throw new Error("Missing collection sync scope.");
  await supabaseRest("/rest/v1/vault_extension_collections?on_conflict=bearer_hash,client_key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    feature: FEATURE,
    errorMessage: "Could not save extension collection.",
    body: { bearer_hash: scope, user_id: null, client_key: clientKey, name, updated_at: new Date().toISOString() }
  });
  return { id: clientKey, name, system: false };
}
