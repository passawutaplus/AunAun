const SESSION_KEY = "aplus-vault-supabase-session";

export function createVaultRemote(config = {}) {
  const url = String(config.supabaseUrl || "").replace(/\/$/, "");
  const key = String(config.supabasePublishableKey || "");
  const bucket = String(config.storageBucket || "vault-assets");
  const enabled = !!url && !!key;
  const collectionKeyToRemoteId = new Map();

  const headers = extra => Object.assign({
    apikey: key,
    authorization: `Bearer ${session()?.access_token || key}`,
  }, extra || {});

  function session() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function setSession(value) {
    if (!value) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(value));
  }

  function consumeAuthCallback() {
    if (!enabled || !location.hash || !location.hash.includes("access_token=")) return null;
    const params = new URLSearchParams(location.hash.slice(1));
    const accessToken = params.get("access_token");
    if (!accessToken) return null;

    const expiresIn = Number(params.get("expires_in") || 3600);
    const value = {
      access_token: accessToken,
      refresh_token: params.get("refresh_token") || "",
      token_type: params.get("token_type") || "bearer",
      provider_token: params.get("provider_token") || "",
      expires_in: expiresIn,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    };
    setSession(value);
    history.replaceState(null, document.title, location.pathname + location.search);
    return value;
  }

  async function request(path, options = {}) {
    if (!enabled) throw new Error("Supabase is not configured.");
    const response = await fetch(url + path, options);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(data?.msg || data?.message || data?.error_description || "Supabase request failed.");
    }
    return data;
  }

  async function signInWithPassword(email, password) {
    const data = await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: headers({ "content-type": "application/json" }),
      body: JSON.stringify({ email, password }),
    });
    setSession(data);
    return data;
  }

  async function signUpWithPassword(email, password) {
    const data = await request("/auth/v1/signup", {
      method: "POST",
      headers: headers({ "content-type": "application/json" }),
      body: JSON.stringify({ email, password }),
    });
    if (data?.access_token) setSession(data);
    return data;
  }

  async function getSession() {
    const current = session();
    if (!current?.access_token) return null;
    try {
      const user = await request("/auth/v1/user", { headers: headers() });
      return Object.assign({}, current, { user });
    } catch (e) {
      setSession(null);
      return null;
    }
  }

  function signInWithGoogle(redirectTo = location.href) {
    if (!enabled) throw new Error("Supabase is not configured.");
    const target = `${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
    location.href = target;
  }

  async function signOut() {
    const current = session();
    if (current?.access_token) {
      await fetch(url + "/auth/v1/logout", {
        method: "POST",
        headers: headers(),
      }).catch(() => {});
    }
    setSession(null);
  }

  async function fetchTable(path) {
    return request(path, { headers: headers({ accept: "application/json" }) });
  }

  async function loadVault() {
    const [items, collections, collectionLinks, projects] = await Promise.all([
      fetchTable("/rest/v1/vault_items?select=*,vault_item_analysis(*)&order=pinned_at.desc.nullslast,created_at.desc"),
      fetchTable("/rest/v1/vault_collections?select=*&order=created_at.asc"),
      fetchTable("/rest/v1/vault_collection_items?select=item_id,collection_id&order=created_at.asc"),
      fetchTable("/rest/v1/vault_projects?select=*,vault_boards(*,vault_board_objects(*))&order=created_at.asc"),
    ]);
    collectionKeyToRemoteId.clear();
    collections.forEach(row => {
      collectionKeyToRemoteId.set(row.id, row.id);
      if (row.client_key) collectionKeyToRemoteId.set(row.client_key, row.id);
      if (row.name) collectionKeyToRemoteId.set(row.name, row.id);
    });
    const collectionIdMap = new Map(collections.map(row => [row.id, row.client_key || row.id]));
    const linkMap = new Map();
    collectionLinks.forEach(link => {
      const localId = collectionIdMap.get(link.collection_id) || link.collection_id;
      if (!linkMap.has(link.item_id)) linkMap.set(link.item_id, []);
      linkMap.get(link.item_id).push(localId);
    });
    const localItems = await Promise.all(items.map(async row => {
      if (row.asset_path && !row.asset_url) row.signed_asset_url = await signedUrl(row.asset_path);
      if (row.thumbnail_path && !row.thumbnail_url) row.signed_thumbnail_url = await signedUrl(row.thumbnail_path);
      return remoteItemToLocal(row, linkMap.get(row.id));
    }));
    return {
      items: localItems,
      collections: collections.map(remoteCollectionToLocal),
      projects: projects.map(remoteProjectToLocal),
    };
  }

  async function saveItem(item) {
    const current = await getSession();
    const userId = current?.user?.id;
    if (!userId) throw new Error("Sign in before syncing to Supabase.");
    const uploaded = await maybeUploadAsset(item, userId);
    const row = {
      user_id: userId,
      type: item.type,
      title: item.title || "Untitled reference",
      note: item.note || null,
      source_url: item.sourceUrl || null,
      asset_url: uploaded.assetUrl || externalAssetUrl(item),
      asset_path: uploaded.assetPath || null,
      thumbnail_url: item.thumbnailUrl || item.previewUrl || null,
      preview_url: item.previewUrl || item.thumbnailUrl || null,
      status: item.status || "ready",
      pinned_at: item.pinnedAt ? new Date(Number(item.pinnedAt)).toISOString() : null,
      capture_context: item.captureContext || {},
      client_payload: stripLocalPayload(item),
    };
    const rows = await request("/rest/v1/vault_items", {
      method: "POST",
      headers: headers({
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify(row),
    });
    const saved = rows[0];
    await saveAnalysis(saved.id, userId, item.analysis || {});
    await syncCollectionLinks(saved.id, userId, item.collectionIds || [], item);
    return saved;
  }

  async function updateItem(item) {
    const remoteId = item.remoteId || item.id;
    if (!isUuid(remoteId)) return null;
    const row = {
      title: item.title || "Untitled reference",
      note: item.note || null,
      source_url: item.sourceUrl || null,
      asset_url: externalAssetUrl(item),
      thumbnail_url: item.thumbnailUrl || item.previewUrl || null,
      preview_url: item.previewUrl || item.thumbnailUrl || null,
      pinned_at: item.pinnedAt ? new Date(Number(item.pinnedAt)).toISOString() : null,
      capture_context: item.captureContext || {},
      client_payload: stripLocalPayload(item),
    };
    const rows = await request(`/rest/v1/vault_items?id=eq.${encodeURIComponent(remoteId)}`, {
      method: "PATCH",
      headers: headers({
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify(row),
    });
    const current = await getSession();
    if (current?.user?.id) await syncCollectionLinks(remoteId, current.user.id, item.collectionIds || [], item);
    return rows[0] || null;
  }

  async function deleteItem(item) {
    const remoteId = item.remoteId || item.id;
    if (!isUuid(remoteId)) return;
    await request(`/rest/v1/vault_items?id=eq.${encodeURIComponent(remoteId)}`, {
      method: "DELETE",
      headers: headers({ prefer: "return=minimal" }),
    });
  }

  async function saveCollection(collection) {
    const current = await getSession();
    const userId = current?.user?.id;
    if (!userId || collection.system) return null;
    const rows = await request("/rest/v1/vault_collections", {
      method: "POST",
      headers: headers({
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify({
        user_id: userId,
        name: collection.name,
        system: false,
        client_key: collection.id,
        metadata: { localId: collection.id, parentId: collection.parentId || null, sortOrder: Number(collection.sortOrder) || 0 },
      }),
    });
    const saved = rows[0] || null;
    if (saved) {
      collectionKeyToRemoteId.set(saved.id, saved.id);
      if (saved.client_key) collectionKeyToRemoteId.set(saved.client_key, saved.id);
      if (collection.id) collectionKeyToRemoteId.set(collection.id, saved.id);
      if (saved.name) collectionKeyToRemoteId.set(saved.name, saved.id);
    }
    return saved;
  }

  async function renameCollection(collection) {
    const remoteId = collection.remoteId || collection.id;
    if (!isUuid(remoteId)) return null;
    const rows = await request(`/rest/v1/vault_collections?id=eq.${encodeURIComponent(remoteId)}`, {
      method: "PATCH",
      headers: headers({
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify({
        name: collection.name,
        metadata: {
          localId: collection.id,
          parentId: collection.parentId || null,
          sortOrder: Number(collection.sortOrder) || 0,
        },
      }),
    });
    const saved = rows[0] || null;
    if (saved) {
      collectionKeyToRemoteId.set(saved.id, saved.id);
      if (saved.client_key) collectionKeyToRemoteId.set(saved.client_key, saved.id);
      if (collection.id) collectionKeyToRemoteId.set(collection.id, saved.id);
      if (saved.name) collectionKeyToRemoteId.set(saved.name, saved.id);
    }
    return saved;
  }

  async function deleteCollection(collection) {
    const remoteId = collection.remoteId || collection.id;
    if (!isUuid(remoteId)) return;
    await request(`/rest/v1/vault_collections?id=eq.${encodeURIComponent(remoteId)}`, {
      method: "DELETE",
      headers: headers({ prefer: "return=minimal" }),
    });
    collectionKeyToRemoteId.delete(remoteId);
    if (collection.id) collectionKeyToRemoteId.delete(collection.id);
    if (collection.name) collectionKeyToRemoteId.delete(collection.name);
  }

  async function saveAnalysis(itemId, userId, analysis) {
    if (!itemId || !userId) return;
    await request("/rest/v1/vault_item_analysis", {
      method: "POST",
      headers: headers({
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({
        item_id: itemId,
        user_id: userId,
        tags: Array.isArray(analysis.tags) ? analysis.tags : [],
        colors: Array.isArray(analysis.colors) ? analysis.colors : [],
        ocr_text: analysis.ocrText || analysis.ocr_text || null,
        summary: analysis.summary || null,
      }),
    }).catch(() => {});
  }

  async function syncCollectionLinks(itemId, userId, collectionIds, item) {
    if (!isUuid(itemId) || !userId) return;
    await request(`/rest/v1/vault_collection_items?item_id=eq.${encodeURIComponent(itemId)}`, {
      method: "DELETE",
      headers: headers({ prefer: "return=minimal" }),
    }).catch(() => {});
    const rows = (Array.isArray(collectionIds) ? collectionIds : [])
      .map(id => collectionRemoteId(id, item))
      .filter(isUuid)
      .map((collectionId, index) => ({
        item_id: itemId,
        collection_id: collectionId,
        user_id: userId,
        position: index,
      }));
    if (!rows.length) return;
    await request("/rest/v1/vault_collection_items", {
      method: "POST",
      headers: headers({
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(rows),
    }).catch(() => {});
  }

  function collectionRemoteId(id, item) {
    if (!id || id === "all" || id === "inbox") return "";
    if (isUuid(id)) return id;
    if (collectionKeyToRemoteId.has(id)) return collectionKeyToRemoteId.get(id);
    const collections = Array.isArray(item?.clientCollections) ? item.clientCollections : [];
    const match = collections.find(collection => collection.id === id || collection.client_key === id || collection.name === id);
    return match?.remoteId || match?.id || "";
  }

  async function maybeUploadAsset(item, userId) {
    if (!item.assetUrl || !item.assetUrl.startsWith("data:")) return {};
    const blob = dataUrlToBlob(item.assetUrl);
    const ext = extensionForMime(blob.type);
    const assetPath = `${userId}/${Date.now()}-${slug(item.title || "vault-object")}.${ext}`;
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${assetPath}`, {
      method: "POST",
      headers: headers({
        "content-type": blob.type || "application/octet-stream",
        "x-upsert": "true",
      }),
      body: blob,
    });
    if (!response.ok) return {};
    return { assetPath };
  }

  async function signedUrl(path) {
    const cleanPath = String(path || "").replace(/^\/+/, "");
    if (!cleanPath) return "";
    try {
      const data = await request(`/storage/v1/object/sign/${bucket}/${cleanPath}`, {
        method: "POST",
        headers: headers({ "content-type": "application/json" }),
        body: JSON.stringify({ expiresIn: 3600 }),
      });
      return data?.signedURL ? `${url}/storage/v1${data.signedURL}` : "";
    } catch (e) {
      return "";
    }
  }

  async function saveProjects(projects) {
    const current = await getSession();
    const userId = current?.user?.id;
    if (!userId) return projects;

    const synced = [];
    for (const project of projects || []) {
      const projectPayload = {
        user_id: userId,
        name: project.name || "Untitled project",
        description: project.description || "",
        client_key: project.id,
        metadata: {
          localId: project.id,
          collectionIds: Array.isArray(project.collectionIds) ? project.collectionIds.filter(Boolean) : [],
        },
        updated_at: new Date().toISOString(),
      };
      let projectRemoteId = project.remoteId && isUuid(project.remoteId) ? project.remoteId : "";
      if (projectRemoteId) {
        await request(`/rest/v1/vault_projects?id=eq.${projectRemoteId}`, {
          method: "PATCH",
          headers: headers({ "content-type": "application/json", prefer: "return=representation" }),
          body: JSON.stringify({ name: projectPayload.name, description: projectPayload.description, metadata: projectPayload.metadata, updated_at: projectPayload.updated_at }),
        });
      } else {
        const rows = await request("/rest/v1/vault_projects", {
          method: "POST",
          headers: headers({ "content-type": "application/json", prefer: "return=representation" }),
          body: JSON.stringify(projectPayload),
        });
        projectRemoteId = rows[0]?.id || "";
      }

      const boards = [];
      for (const board of project.boards || []) {
        const boardPayload = {
          user_id: userId,
          project_id: projectRemoteId,
          name: board.name || "Moodboard",
          client_key: board.id,
          objects_snapshot: board.objects || [],
          updated_at: new Date().toISOString(),
        };
        let boardRemoteId = board.remoteId && isUuid(board.remoteId) ? board.remoteId : "";
        if (boardRemoteId) {
          await request(`/rest/v1/vault_boards?id=eq.${boardRemoteId}`, {
            method: "PATCH",
            headers: headers({ "content-type": "application/json", prefer: "return=representation" }),
            body: JSON.stringify({
              name: boardPayload.name,
              objects_snapshot: boardPayload.objects_snapshot,
              updated_at: boardPayload.updated_at,
            }),
          });
        } else if (projectRemoteId) {
          const rows = await request("/rest/v1/vault_boards", {
            method: "POST",
            headers: headers({ "content-type": "application/json", prefer: "return=representation" }),
            body: JSON.stringify(boardPayload),
          });
          boardRemoteId = rows[0]?.id || "";
        }
        boards.push(Object.assign({}, board, { remoteId: boardRemoteId || board.remoteId }));
      }

      synced.push(Object.assign({}, project, { remoteId: projectRemoteId || project.remoteId, boards }));
    }
    return synced;
  }

  return {
    enabled,
    hasSession: () => !!session()?.access_token,
    consumeAuthCallback,
    getSession,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
    loadVault,
    saveItem,
    updateItem,
    deleteItem,
    saveCollection,
    renameCollection,
    deleteCollection,
    saveProjects,
  };
}

function remoteItemToLocal(row, linkedCollectionIds) {
  const analysisRow = Array.isArray(row.vault_item_analysis) ? row.vault_item_analysis[0] : row.vault_item_analysis;
  const payload = row.client_payload && typeof row.client_payload === "object" ? row.client_payload : {};
  const collectionIds = Array.isArray(linkedCollectionIds) && linkedCollectionIds.length
    ? ["all"].concat(linkedCollectionIds.filter(id => id !== "all"))
    : payload.collectionIds || ["all"];
  return Object.assign({}, payload, {
    id: row.id,
    remoteId: row.id,
    type: row.type,
    title: row.title,
    note: row.note || "",
    sourceUrl: row.source_url || "",
    assetUrl: row.signed_asset_url || row.asset_url || payload.assetUrl || "",
    thumbnailUrl: row.signed_thumbnail_url || row.thumbnail_url || payload.thumbnailUrl || "",
    previewUrl: row.preview_url || row.signed_thumbnail_url || payload.previewUrl || "",
    status: row.status || "ready",
    pinnedAt: row.pinned_at ? new Date(row.pinned_at).getTime() : 0,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    captureContext: row.capture_context || payload.captureContext || {},
    collectionIds,
    projectIds: payload.projectIds || [],
    analysis: {
      tags: analysisRow?.tags || payload.analysis?.tags || [],
      colors: analysisRow?.colors || payload.analysis?.colors || [],
      ocrText: analysisRow?.ocr_text || payload.analysis?.ocrText || "",
      summary: analysisRow?.summary || payload.analysis?.summary || "",
    },
  });
}

function remoteCollectionToLocal(row) {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.client_key || row.id,
    remoteId: row.id,
    name: row.name,
    system: !!row.system,
    parentId: metadata.parentId ? String(metadata.parentId) : "",
    sortOrder: Number(metadata.sortOrder) || 0,
  };
}

function collectionRemoteId(id, item) {
  if (!id || id === "all" || id === "inbox") return "";
  if (isUuid(id)) return id;
  const collections = Array.isArray(item?.clientCollections) ? item.clientCollections : [];
  const match = collections.find(collection => collection.id === id || collection.client_key === id || collection.name === id);
  return match?.remoteId || match?.id || "";
}

function remoteProjectToLocal(row) {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.client_key || row.id,
    remoteId: row.id,
    name: row.name,
    description: row.description || "",
    collectionIds: Array.isArray(metadata.collectionIds) ? metadata.collectionIds.filter(Boolean).map(String) : [],
    boards: (row.vault_boards || []).map(board => ({
      id: board.client_key || board.id,
      remoteId: board.id,
      name: board.name,
      objects: board.objects_snapshot || (board.vault_board_objects || []).map(remoteBoardObjectToLocal),
    })),
  };
}

function remoteBoardObjectToLocal(row) {
  return {
    id: row.id,
    kind: row.kind,
    itemId: row.item_id || "",
    text: row.text_content || "",
    colors: row.colors || [],
    x: Number(row.x) || 40,
    y: Number(row.y) || 40,
    w: Number(row.w) || 180,
    h: Number(row.h) || 140,
    zIndex: Number(row.z_index) || 0,
  };
}

function stripLocalPayload(item) {
  const clone = Object.assign({}, item);
  if (clone.assetUrl && clone.assetUrl.startsWith("data:")) clone.assetUrl = "";
  delete clone.remoteId;
  return clone;
}

function externalAssetUrl(item) {
  if (!item.assetUrl || item.assetUrl.startsWith("data:")) return null;
  return item.assetUrl;
}

function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(",");
  const mime = (head.match(/data:(.*?);base64/) || [])[1] || "application/octet-stream";
  const binary = atob(body || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function extensionForMime(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/png") return "png";
  return "bin";
}

function slug(value) {
  return String(value || "vault-object").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "vault-object";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}
