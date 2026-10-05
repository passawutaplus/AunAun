const SESSION_KEY = "aplus-vault-supabase-session";
const PAGE_SIZE = 1000;
const SIGN_BATCH = 100;

function cleanStoragePath(path) {
  return String(path || "").replace(/^\/+/, "");
}

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

  async function signOut({ everywhere = false } = {}) {
    const current = session();
    if (current?.access_token) {
      await fetch(url + "/auth/v1/logout" + (everywhere ? "?scope=global" : ""), {
        method: "POST",
        headers: headers(),
      }).catch(() => {});
    }
    setSession(null);
  }

  async function fetchTable(path) {
    return request(path, { headers: headers({ accept: "application/json" }) });
  }

  // PostgREST caps responses (1000 rows by default); page so large libraries load completely.
  async function fetchAll(path, pageSize = PAGE_SIZE) {
    const rows = [];
    for (let offset = 0; ; offset += pageSize) {
      const page = await fetchTable(`${path}${path.includes("?") ? "&" : "?"}limit=${pageSize}&offset=${offset}`);
      if (!Array.isArray(page)) return rows;
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }

  async function loadVault() {
    const [items, collections, collectionLinks, projectRows, boards] = await Promise.all([
      fetchAll("/rest/v1/vault_items?select=*,vault_item_analysis(*)&order=pinned_at.desc.nullslast,created_at.desc,id.desc"),
      fetchAll("/rest/v1/vault_collections?select=*&order=created_at.asc,id.asc"),
      fetchAll("/rest/v1/vault_collection_items?select=item_id,collection_id&order=created_at.asc,item_id.asc"),
      fetchAll("/rest/v1/vault_projects?select=*&order=created_at.asc,id.asc"),
      fetchAll("/rest/v1/vault_boards?select=*,vault_board_objects(*)&order=updated_at.desc,id.desc").catch(() => []),
    ]);
    const boardsByProject = new Map();
    (boards || []).forEach(board => {
      if (!board.project_id) return;
      if (!boardsByProject.has(board.project_id)) boardsByProject.set(board.project_id, []);
      boardsByProject.get(board.project_id).push(board);
    });
    const projects = projectRows.map(row => Object.assign({}, row, { vault_boards: boardsByProject.get(row.id) || [] }));
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
    const signed = await signedUrls(items.flatMap(row => [
      row.asset_path && !row.asset_url ? row.asset_path : "",
      row.thumbnail_path && !row.thumbnail_url ? row.thumbnail_path : "",
    ]));
    const localItems = items.map(row => {
      if (row.asset_path && !row.asset_url) row.signed_asset_url = signed.get(cleanStoragePath(row.asset_path)) || "";
      if (row.thumbnail_path && !row.thumbnail_url) row.signed_thumbnail_url = signed.get(cleanStoragePath(row.thumbnail_path)) || "";
      return remoteItemToLocal(row, linkMap.get(row.id));
    });
    const projectIdByRemote = new Map(projects.map(row => [row.id, row.client_key || row.id]));
    const moodboardsFromTable = (boards || []).map(row => remoteMoodboardToLocal(row, projectIdByRemote));
    return {
      items: localItems,
      collections: collections.map(remoteCollectionToLocal),
      projects: projects.map(remoteProjectToLocal),
      moodboards: moodboardsFromTable,
    };
  }

  async function saveItem(item) {
    const current = await getSession();
    const userId = current?.user?.id;
    if (!userId) throw new Error("Sign in before syncing to Supabase.");
    const uploaded = await maybeUploadAsset(item, userId);
    // Extension uploads arrive with a short-lived signed URL; keep the path so loads re-sign it.
    const ownedPath = typeof item.assetPath === "string" && item.assetPath.startsWith(`${userId}/`) ? item.assetPath : "";
    const row = {
      user_id: userId,
      type: item.type,
      title: item.title || "Untitled reference",
      note: item.note || null,
      source_url: item.sourceUrl || null,
      asset_url: ownedPath ? null : uploaded.assetUrl || externalAssetUrl(item),
      asset_path: uploaded.assetPath || ownedPath || null,
      thumbnail_url: ownedPath ? null : item.thumbnailUrl || item.previewUrl || null,
      thumbnail_path: ownedPath || null,
      preview_url: ownedPath ? null : item.previewUrl || item.thumbnailUrl || null,
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
    if (typeof item.assetPath === "string" && item.assetPath) {
      delete row.asset_url;
      delete row.thumbnail_url;
      delete row.preview_url;
    }
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
        metadata: { localId: collection.id, parentId: collection.parentId || null, sortOrder: Number(collection.sortOrder) || 0, pinnedAt: Number(collection.pinnedAt) || 0 },
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
          pinnedAt: Number(collection.pinnedAt) || 0,
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

  /** One storage request per 100 paths instead of one per file. */
  async function signedUrls(paths) {
    const unique = Array.from(new Set(paths.map(cleanStoragePath).filter(Boolean)));
    const out = new Map();
    for (let i = 0; i < unique.length; i += SIGN_BATCH) {
      try {
        const data = await request(`/storage/v1/object/sign/${bucket}`, {
          method: "POST",
          headers: headers({ "content-type": "application/json" }),
          body: JSON.stringify({ expiresIn: 3600, paths: unique.slice(i, i + SIGN_BATCH) }),
        });
        (Array.isArray(data) ? data : []).forEach(entry => {
          if (entry?.path && entry.signedURL && !entry.error) out.set(entry.path, `${url}/storage/v1${entry.signedURL}`);
        });
      } catch (e) {}
    }
    return out;
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
          pinnedAt: Number(project.pinnedAt) || 0,
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

  async function saveMoodboards(moodboards, projects, items) {
    const current = await getSession();
    const userId = current?.user?.id;
    if (!userId) return moodboards;
    const projectRemoteByLocal = new Map();
    (projects || []).forEach((p) => {
      if (p.remoteId && isUuid(p.remoteId)) projectRemoteByLocal.set(p.id, p.remoteId);
    });
    const itemLookup = Array.isArray(items) ? items : [];
    const synced = [];
    for (const board of moodboards || []) {
      const projectRemoteId = board.projectId ? projectRemoteByLocal.get(board.projectId) || null : null;
      const boardPayload = {
        user_id: userId,
        project_id: projectRemoteId,
        name: board.name || "Moodboard",
        client_key: board.id,
        layout_mode: board.layoutMode || "smart_grid",
        grid_preset: board.gridPreset || "balanced",
        gap: board.gap || 16,
        padding: board.padding || 24,
        visibility: board.visibility || "private",
        version: board.version || 1,
        background: board.background || "#ffffff",
        width: board.width || 1200,
        height: board.height || 900,
        objects_snapshot: board.objects || [],
        updated_at: new Date().toISOString(),
      };
      let boardRemoteId = board.remoteId && isUuid(board.remoteId) ? board.remoteId : "";
      try {
        if (boardRemoteId) {
          await request(`/rest/v1/vault_boards?id=eq.${boardRemoteId}`, {
            method: "PATCH",
            headers: headers({ "content-type": "application/json", prefer: "return=representation" }),
            body: JSON.stringify(boardPayload),
          });
        } else {
          const rows = await request("/rest/v1/vault_boards", {
            method: "POST",
            headers: headers({ "content-type": "application/json", prefer: "return=representation" }),
            body: JSON.stringify(boardPayload),
          });
          boardRemoteId = rows[0]?.id || "";
        }
      } catch (err) {
        console.warn("A+ Vault moodboard sync failed", err);
      }
      if (boardRemoteId) {
        try {
          await writeBoardObjects(boardRemoteId, userId, board.objects || [], itemLookup);
        } catch (err) {
          console.warn("A+ Vault board objects sync failed", err);
        }
      }
      synced.push(Object.assign({}, board, { remoteId: boardRemoteId || board.remoteId }));
    }
    return synced;
  }

  async function writeBoardObjects(boardRemoteId, userId, objects, items) {
    await request(`/rest/v1/vault_board_objects?board_id=eq.${boardRemoteId}`, { method: "DELETE", headers: headers() });
    const rows = (objects || []).map((o, index) => {
      const style = Object.assign({}, o.style && typeof o.style === "object" ? o.style : {});
      if (o.kind === "connector") {
        style.fromId = o.fromId || "";
        style.toId = o.toId || "";
        style.color = o.color || "#f05040";
      } else if (o.kind === "todo") {
        style.tasks = Array.isArray(o.style?.tasks) ? o.style.tasks : [];
      } else if (o.kind === "palette") {
        style.mode = o.style?.mode === "swatch" ? "swatch" : "palette";
        if (o.text) style.label = o.text;
      } else if (o.kind === "frame") {
        style.color = o.color || "#f05040";
        if (o.text) style.label = o.text;
      } else if (o.kind === "note" || o.kind === "text") {
        if (o.color) style.color = o.color;
        if (o.style && o.style.background) style.background = o.style.background;
        else if (o.kind === "note" && o.color) style.background = o.color;
      } else if (o.color) {
        style.color = o.color;
      }
      return {
        board_id: boardRemoteId,
        user_id: userId,
        kind: o.kind || "item",
        item_id: o.kind === "item" ? resolveItemRemoteId(o.itemId, items) : null,
        text_content: o.text || null,
        colors: Array.isArray(o.colors) ? o.colors : [],
        x: Number(o.x) || 0,
        y: Number(o.y) || 0,
        w: Number(o.w) || 180,
        h: Number(o.h) || 140,
        rotation: Number(o.rotation) || 0,
        z_index: Number(o.zIndex) || index,
        sort_order: Number(o.sortOrder) || index,
        style,
      };
    });
    if (!rows.length) return;
    await request("/rest/v1/vault_board_objects", {
      method: "POST",
      headers: headers({ "content-type": "application/json", prefer: "return=minimal" }),
      body: JSON.stringify(rows),
    });
  }

  async function rpc(name, args = {}) {
    return request(`/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: headers({ "content-type": "application/json", accept: "application/json" }),
      body: JSON.stringify(args),
    });
  }

  async function submitFeedback({ rating, message, feature = "vault" } = {}) {
    const current = await getSession();
    const userId = current?.user?.id;
    if (!userId) throw new Error("Sign in with a real account before sending feedback.");
    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new Error("Choose a rating from 1 to 5.");
    }
    const rows = await request("/rest/v1/vault_feedback", {
      method: "POST",
      headers: headers({ "content-type": "application/json", prefer: "return=representation" }),
      body: JSON.stringify({
        user_id: userId,
        user_email: current.user.email || null,
        user_name: current.user.user_metadata?.full_name || current.user.user_metadata?.name || null,
        feature: feature || "vault",
        message: String(message || "").trim() || `(rating only — ${score}/5)`,
        rating: score,
      }),
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async function adminOverview() {
    return rpc("vault_admin_overview");
  }

  async function adminListFeedback(limit = 50) {
    return rpc("vault_admin_list_feedback", { p_limit: limit });
  }

  async function adminListCaptures(limit = 40) {
    return rpc("vault_admin_list_captures", { p_limit: limit });
  }

  async function adminPurgeCaptures(olderThanDays = 30) {
    return rpc("vault_admin_purge_captures", { p_older_than_days: olderThanDays });
  }

  /** Title + thumbnail for a pasted link. Never throws: no session, offline or a blocked site just means no preview. */
  async function linkPreview(linkUrl) {
    const token = session()?.access_token;
    if (!enabled || !token) return null;
    try {
      const response = await fetch(`/api/vault/preview?url=${encodeURIComponent(linkUrl)}`, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data && data.success ? data.preview : null;
    } catch (e) {
      return null;
    }
  }

  /** Safe link import (phase 01). Resolves { ok, data } or { ok:false, code, message }; null when offline/guest. Never throws. */
  async function importUrl(linkUrl) {
    const token = session()?.access_token;
    if (!enabled || !token) return null;
    try {
      const response = await fetch("/api/import-url", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ url: linkUrl }),
        signal: AbortSignal.timeout(12000),
      });
      const body = await response.json().catch(() => null);
      if (body && body.success) return { ok: true, data: body.data };
      return { ok: false, code: (body && body.code) || "FETCH_FAILED", message: (body && body.message) || "" };
    } catch (e) {
      return null;
    }
  }

  /** Server-side enrichment for a local-first item (real palette + taxonomy tags). Resolves analysis or null; never throws. */
  async function enrichItem(payload) {
    const token = session()?.access_token;
    if (!enabled || !token) return null;
    try {
      const response = await fetch("/api/vault/enrich", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => null);
      return body && body.success ? body.analysis : null;
    } catch (e) {
      return null;
    }
  }

  async function authedPost(path, body) {
    const token = session()?.access_token;
    if (!enabled || !token) throw new Error("Sign in with a real account first.");
    const response = await fetch(path, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(90000) });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.success === false) throw new Error((data && data.message) || "Request failed. Try again in a moment.");
    return data;
  }
  const exportAccountData = () => authedPost("/api/account/export");
  const deleteAccountData = confirm => authedPost("/api/account/delete", { confirm });
  /** Records a consent choice (append-only log) for the signed-in user. Never throws. */
  async function logConsent(purpose, granted, policyVersion) {
    try {
      await rpc("log_consent", { p_purpose: purpose, p_granted: Boolean(granted), p_policy_version: policyVersion });
      return true;
    } catch (e) {
      return false;
    }
  }

  /** A creator shares their OWN uploaded image to Discover. Checks run automatically afterwards (creator_submissions). */
  async function shareToDiscover(item, { title, creditName, license, linkUrl }) {
    const current = await getSession();
    const userId = current?.user?.id;
    if (!userId) throw new Error("Log in to share your work.");
    const ownedPath = typeof item.assetPath === "string" && item.assetPath.startsWith(`${userId}/`) ? item.assetPath : "";
    const uploaded = ownedPath ? { assetPath: ownedPath } : await maybeUploadAsset(item, userId);
    if (!uploaded.assetPath) throw new Error("Could not prepare the image for sharing. Try again in a moment.");
    try {
      const rows = await request("/rest/v1/creator_submissions", {
        method: "POST",
        headers: headers({ "content-type": "application/json", prefer: "return=representation" }),
        body: JSON.stringify({ user_id: userId, asset_path: uploaded.assetPath, title, credit_name: creditName, license, link_url: linkUrl || null, owner_confirmed: true }),
      });
      return Array.isArray(rows) ? rows[0] : rows;
    } catch (e) {
      if (/duplicate key|creator_submissions_asset_key/i.test(String(e.message))) throw new Error("This image is already shared or waiting to be checked.");
      if (/daily submission limit/i.test(String(e.message))) throw new Error("You reached today's sharing limit. Try again tomorrow.");
      throw e;
    }
  }

  async function listSubmissions() {
    if (!enabled || !session()?.access_token) return [];
    try {
      const rows = await request("/rest/v1/creator_submissions?select=id,asset_path,title,status,reject_reason,license,created_at&order=created_at.desc&limit=200", { headers: headers() });
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      return [];
    }
  }

  async function withdrawSubmission(id) {
    await rpc("creator_withdraw", { p_id: id });
    return true;
  }

  return {
    enabled,
    linkPreview,
    importUrl,
    shareToDiscover,
    listSubmissions,
    withdrawSubmission,
    enrichItem,
    exportAccountData,
    deleteAccountData,
    logConsent,
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
    saveMoodboards,
    submitFeedback,
    adminOverview,
    adminListFeedback,
    adminListCaptures,
    adminPurgeCaptures,
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
    pinnedAt: Number(metadata.pinnedAt) || 0,
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
    pinnedAt: Number(metadata.pinnedAt) || 0,
    boards: (row.vault_boards || []).map(board => ({
      id: board.client_key || board.id,
      remoteId: board.id,
      name: board.name,
      objects: board.objects_snapshot || (board.vault_board_objects || []).map(remoteBoardObjectToLocal),
    })),
  };
}

function remoteMoodboardToLocal(row, projectIdByRemote) {
  const projectLocal = row.project_id ? projectIdByRemote?.get(row.project_id) || "" : "";
  return {
    id: row.client_key || row.id,
    remoteId: row.id,
    name: row.name,
    projectId: projectLocal,
    layoutMode: row.layout_mode || "smart_grid",
    gridPreset: row.grid_preset || "balanced",
    gap: Number(row.gap) || 16,
    padding: Number(row.padding) || 24,
    visibility: row.visibility || "private",
    version: Number(row.version) || 1,
    width: Number(row.width) || 1200,
    height: Number(row.height) || 900,
    background: row.background || "#ffffff",
    objects: row.objects_snapshot || (row.vault_board_objects || []).map(remoteBoardObjectToLocal),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

function remoteBoardObjectToLocal(row) {
  const style = row.style && typeof row.style === "object" ? row.style : {};
  return {
    id: row.id,
    kind: row.kind,
    itemId: row.item_id || "",
    fromId: style.fromId || "",
    toId: style.toId || "",
    text: row.text_content || style.label || "",
    color: style.color || "",
    colors: row.colors || [],
    x: Number(row.x) || 40,
    y: Number(row.y) || 40,
    w: Number(row.w) || 180,
    h: Number(row.h) || 140,
    zIndex: Number(row.z_index) || 0,
    sortOrder: Number(row.sort_order) || 0,
    style,
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

function resolveItemRemoteId(itemId, items) {
  if (!itemId) return null;
  if (isUuid(itemId)) return itemId;
  const match = (items || []).find(item => item && (item.id === itemId || item.remoteId === itemId));
  if (!match) return null;
  const remote = match.remoteId || match.id;
  return isUuid(remote) ? remote : null;
}
