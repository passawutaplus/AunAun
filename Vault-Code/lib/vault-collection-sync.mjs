import { hashBearer, scopeHashFromAuth } from "./vault-api-auth.mjs";

const DEFAULT_SUPABASE_URL = "https://zkflkpbmbozrchqncpzi.supabase.co";

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VAULT_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VAULT_SUPABASE_SERVICE_ROLE_KEY || "";
  if (!key) throw new Error("Collection sync API is not configured on the server.");
  return { url, key };
}

function restHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCollection(row) {
  const id = text(row?.id) || text(row?.client_key) || text(row?.clientKey);
  const name = text(row?.name);
  if (!id || !name || id === "all") return null;
  return { id, name, system: false };
}

function mapUserCollection(row) {
  if (!row || row.system) return null;
  return normalizeCollection({
    id: row.client_key || row.id,
    name: row.name
  });
}

function mapExtensionCollection(row) {
  return normalizeCollection({
    id: row.client_key || row.id,
    name: row.name
  });
}

export async function readExtensionCollections(auth) {
  const { url, key } = supabaseConfig();
  const collections = [];

  if (auth?.userId) {
    const response = await fetch(
      `${url}/rest/v1/vault_collections?select=id,client_key,name,system&user_id=eq.${encodeURIComponent(auth.userId)}&system=eq.false&order=created_at.asc`,
      { headers: restHeaders(key, { accept: "application/json" }) }
    );
    const textBody = await response.text();
    const rows = textBody ? JSON.parse(textBody) : [];
    if (!response.ok) {
      throw new Error(rows?.message || rows?.error || "Could not load Vault collections.");
    }
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const mapped = mapUserCollection(row);
      if (mapped) collections.push(mapped);
    });
  }

  const scope = scopeHashFromAuth(auth);
  if (scope) {
    const response = await fetch(
      `${url}/rest/v1/vault_extension_collections?select=client_key,name&bearer_hash=eq.${encodeURIComponent(scope)}&order=created_at.asc`,
      { headers: restHeaders(key, { accept: "application/json" }) }
    );
    const textBody = await response.text();
    const rows = textBody ? JSON.parse(textBody) : [];
    if (!response.ok) {
      throw new Error(rows?.message || rows?.error || "Could not load extension collections.");
    }
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const mapped = mapExtensionCollection(row);
      if (mapped && !collections.some(col => col.id === mapped.id)) collections.push(mapped);
    });
  }

  return collections;
}

export async function upsertExtensionCollection(auth, payload) {
  const name = text(payload?.name);
  const clientKey = text(payload?.id) || text(payload?.clientKey);
  if (!name) throw new Error("Collection name is required.");
  if (!clientKey || clientKey === "all") throw new Error("Collection id is required.");

  const { url, key } = supabaseConfig();

  if (auth?.userId) {
    const existingResponse = await fetch(
      `${url}/rest/v1/vault_collections?select=id,client_key,name,system&user_id=eq.${encodeURIComponent(auth.userId)}&client_key=eq.${encodeURIComponent(clientKey)}&limit=1`,
      { headers: restHeaders(key, { accept: "application/json" }) }
    );
    const existingText = await existingResponse.text();
    const existingRows = existingText ? JSON.parse(existingText) : [];
    if (!existingResponse.ok) {
      throw new Error(existingRows?.message || existingRows?.error || "Could not load Vault collection.");
    }
    if (Array.isArray(existingRows) && existingRows[0]) {
      const current = existingRows[0];
      if (text(current.name) !== name) {
        const patchResponse = await fetch(
          `${url}/rest/v1/vault_collections?id=eq.${encodeURIComponent(current.id)}`,
          {
            method: "PATCH",
            headers: restHeaders(key, {
              "content-type": "application/json",
              prefer: "return=representation"
            }),
            body: JSON.stringify({ name })
          }
        );
        const patchText = await patchResponse.text();
        const patchRows = patchText ? JSON.parse(patchText) : [];
        if (!patchResponse.ok) {
          throw new Error(patchRows?.message || patchRows?.error || "Could not update Vault collection.");
        }
        return mapUserCollection(patchRows[0] || current) || { id: clientKey, name, system: false };
      }
      return mapUserCollection(current) || { id: clientKey, name, system: false };
    }

    const createResponse = await fetch(`${url}/rest/v1/vault_collections`, {
      method: "POST",
      headers: restHeaders(key, {
        "content-type": "application/json",
        prefer: "return=representation"
      }),
      body: JSON.stringify({
        user_id: auth.userId,
        name,
        system: false,
        client_key: clientKey,
        metadata: { localId: clientKey }
      })
    });
    const createText = await createResponse.text();
    const createRows = createText ? JSON.parse(createText) : [];
    if (!createResponse.ok) {
      throw new Error(createRows?.message || createRows?.error || "Could not create Vault collection.");
    }
    return mapUserCollection(createRows[0]) || { id: clientKey, name, system: false };
  }

  const scope = scopeHashFromAuth(auth);
  if (!scope) throw new Error("Missing collection sync scope.");

  const response = await fetch(`${url}/rest/v1/vault_extension_collections`, {
    method: "POST",
    headers: restHeaders(key, {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify({
      bearer_hash: scope,
      user_id: auth?.userId || null,
      client_key: clientKey,
      name
    })
  });
  const textBody = await response.text();
  const rows = textBody ? JSON.parse(textBody) : [];
  if (!response.ok) {
    throw new Error(rows?.message || rows?.error || "Could not save extension collection.");
  }
  const saved = Array.isArray(rows) ? rows[0] : rows;
  return mapExtensionCollection(saved) || { id: clientKey, name, system: false };
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
