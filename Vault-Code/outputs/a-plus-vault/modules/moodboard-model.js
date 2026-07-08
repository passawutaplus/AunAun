import { id } from "./core.js";

export const MOODBOARD_SOFT_LIMIT = 100;
export const MOODBOARD_SELECT_MIN = 2;
export const MOODBOARD_SELECT_MAX = 50;
export const DEFAULT_GRID_PRESET = "balanced";

export function normalizeMoodboardObject(o) {
  const kind = ["item", "text", "palette", "note", "connector", "frame", "todo"].includes(o?.kind) ? o.kind : "item";
  const style = o?.style && typeof o.style === "object" ? { ...o.style } : {};
  if (kind === "todo") {
    style.tasks = normalizeTodoTasks(style.tasks || o?.tasks);
  }
  let colors = Array.isArray(o?.colors) ? o.colors.map(String) : [];
  if (kind === "palette") {
    if (style.mode !== "swatch" && style.mode !== "palette") {
      style.mode = colors.length <= 1 ? "swatch" : "palette";
    }
    colors = normalizePaletteColors(colors, style.mode);
    if (style.mode === "swatch" && !String(o?.text || "").trim()) {
      // keep empty; label generated at render from hex
    }
  }
  const defaults = kindDefaults(kind, style.mode);
  const draft = { kind, colors, style };
  const size = kind === "connector"
    ? { w: 0, h: 0 }
    : clampMoodboardSize(kind, Number(o?.w) || defaults.w, Number(o?.h) || defaults.h, draft);
  return {
    id: String(o?.id || id()),
    kind,
    itemId: o?.itemId ? String(o.itemId) : "",
    fromId: o?.fromId ? String(o.fromId) : "",
    toId: o?.toId ? String(o.toId) : "",
    x: Number(o?.x) || 0,
    y: Number(o?.y) || 0,
    w: size.w,
    h: size.h,
    rotation: Number(o?.rotation) || 0,
    zIndex: Number(o?.zIndex ?? o?.z_index) || defaults.zIndex,
    sortOrder: Number(o?.sortOrder ?? o?.sort_order) || 0,
    locked: !!o?.locked,
    text: String(o?.text || defaults.text),
    color: String(o?.color || (colors[0] || defaults.color)),
    size: Number(o?.size) || 28,
    colors,
    caption: String(o?.caption || ""),
    style
  };
}

export function normalizeHex(value, fallback = "#ff4f43") {
  const raw = String(value || "").trim();
  const m = raw.match(/^#?([0-9a-fA-F]{6})$/);
  if (m) return `#${m[1].toLowerCase()}`;
  const short = raw.match(/^#?([0-9a-fA-F]{3})$/);
  if (short) {
    const s = short[1];
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`.toLowerCase();
  }
  return fallback;
}

/** palette = multi-color strip; swatch = single Pantone-style chip */
export function paletteMode(obj) {
  const mode = obj?.style && typeof obj.style === "object" ? obj.style.mode : "";
  if (mode === "swatch" || mode === "palette") return mode;
  const n = Array.isArray(obj?.colors) ? obj.colors.length : 0;
  return n <= 1 ? "swatch" : "palette";
}

function normalizePaletteColors(colors, mode) {
  const list = (Array.isArray(colors) ? colors : [])
    .map((c) => normalizeHex(c, ""))
    .filter(Boolean);
  if (mode === "swatch") return [list[0] || "#ff4f43"];
  if (!list.length) return ["#ff4f43", "#2f3133", "#f8f6f2"];
  return list.slice(0, 8);
}

export function objectGroupId(obj) {
  const gid = obj?.style && typeof obj.style === "object" ? obj.style.groupId : "";
  return gid ? String(gid) : "";
}

export function pantoneChipLabel(hex, name) {
  const custom = String(name || "").trim();
  if (custom) return custom.slice(0, 48);
  const h = normalizeHex(hex).replace("#", "").toUpperCase();
  return `PANTONE ${h.slice(0, 3)}-${h.slice(3)} C`;
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

export function rgbCss(hex) {
  const x = hexToRgb(hex);
  return `rgb(${x.r}, ${x.g}, ${x.b})`;
}

export function cmykCss(hex) {
  const x = hexToRgb(hex);
  const r = x.r / 255;
  const g = x.g / 255;
  const b = x.b / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 0.999) return "0, 0, 0, 100";
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return [c, m, y, k].map((v) => Math.round(v * 100)).join(", ");
}

export function colorFormatRows(hex) {
  const safe = normalizeHex(hex);
  const rgb = rgbCss(safe);
  const cmyk = cmykCss(safe);
  return [
    { label: "HEX", value: safe.toUpperCase(), copy: safe.toUpperCase() },
    { label: "RGB", value: rgb, copy: rgb },
    { label: "CMYK", value: cmyk, copy: `cmyk(${cmyk})` }
  ];
}

function normalizeTodoTasks(list) {
  const tasks = Array.isArray(list) ? list : [];
  const normalized = tasks
    .filter((t) => t && typeof t === "object")
    .slice(0, 40)
    .map((t, i) => ({
      id: String(t.id || `t${i}`),
      text: String(t.text || "").slice(0, 200),
      done: !!t.done
    }));
  if (!normalized.length) {
    return [
      { id: "t0", text: "", done: false },
      { id: "t1", text: "", done: false }
    ];
  }
  return normalized;
}

function kindDefaults(kind, mode) {
  if (kind === "note") return { w: 180, h: 180, zIndex: 1, text: "Sticky note", color: "#ffe08a" };
  if (kind === "connector") return { w: 0, h: 0, zIndex: 0, text: "", color: "#ff4f43" };
  if (kind === "frame") return { w: 420, h: 320, zIndex: 0, text: "Section", color: "#ff4f43" };
  if (kind === "todo") return { w: 260, h: 200, zIndex: 1, text: "To-do", color: "#1a1e24" };
  if (kind === "text") return { w: 220, h: 120, zIndex: 1, text: "", color: "#17191b" };
  if (kind === "palette") {
    if (mode === "swatch") return { w: 148, h: 188, zIndex: 1, text: "", color: "#ff4f43" };
    return { w: 260, h: 88, zIndex: 1, text: "", color: "#ff4f43" };
  }
  return { w: 180, h: 140, zIndex: 1, text: "", color: "#17191b" };
}

/** Soft size bounds so free resize never collapses or explodes the board. */
export function moodboardResizeLimits(kind, obj) {
  if (kind === "frame") return { minW: 160, minH: 120, maxW: 1600, maxH: 1200 };
  if (kind === "todo") return { minW: 180, minH: 140, maxW: 720, maxH: 900 };
  if (kind === "text" || kind === "note") return { minW: 120, minH: 72, maxW: 900, maxH: 700 };
  if (kind === "palette") {
    if (paletteMode(obj) === "swatch") return { minW: 100, minH: 120, maxW: 280, maxH: 480 };
    return { minW: 140, minH: 56, maxW: 720, maxH: 220 };
  }
  if (kind === "connector") return { minW: 0, minH: 0, maxW: 0, maxH: 0 };
  return { minW: 80, minH: 80, maxW: 1200, maxH: 1200 };
}

export function clampMoodboardSize(kind, w, h, obj) {
  const lim = moodboardResizeLimits(kind, obj);
  return {
    w: Math.max(lim.minW, Math.min(lim.maxW, Math.round(Number(w) || lim.minW))),
    h: Math.max(lim.minH, Math.min(lim.maxH, Math.round(Number(h) || lim.minH)))
  };
}

export function normalizeMoodboard(board) {
  const objects = Array.isArray(board?.objects)
    ? board.objects.filter(Boolean).map(normalizeMoodboardObject)
    : [];
  objects.sort((a, b) => a.sortOrder - b.sortOrder || a.zIndex - b.zIndex);
  objects.forEach((o, i) => {
    o.sortOrder = i;
  });
  return {
    id: String(board?.id || id()),
    remoteId: board?.remoteId || "",
    name: String(board?.name || "Untitled Moodboard").trim().slice(0, 120) || "Untitled Moodboard",
    description: String(board?.description || ""),
    projectId: board?.projectId ? String(board.projectId) : "",
    layoutMode: board?.layoutMode === "freeform" ? "freeform" : "smart_grid",
    gridPreset: board?.gridPreset || DEFAULT_GRID_PRESET,
    gap: Number(board?.gap) || 16,
    padding: Number(board?.padding) || 24,
    visibility: board?.visibility === "link" ? "link" : "private",
    version: Number(board?.version) || 1,
    width: Number(board?.width) || 1200,
    height: Number(board?.height) || 900,
    background: String(board?.background || "#ffffff"),
    objects,
    createdAt: Number(board?.createdAt) || Date.now(),
    updatedAt: Number(board?.updatedAt) || Date.now()
  };
}

export function normalizeMoodboards(list) {
  return (Array.isArray(list) ? list : []).filter((b) => b && typeof b === "object").map(normalizeMoodboard);
}

/** Lift nested project.boards into standalone moodboards (idempotent by id). */
export function extractMoodboardsFromProjects(projects, existing) {
  const byId = new Map(normalizeMoodboards(existing).map((b) => [b.id, b]));
  (projects || []).forEach((p) => {
    (p.boards || []).forEach((board) => {
      if (!board || !board.id) return;
      const prev = byId.get(board.id);
      const next = normalizeMoodboard(
        Object.assign({}, board, {
          projectId: prev?.projectId || p.id,
          layoutMode: board.layoutMode || prev?.layoutMode || "freeform",
          updatedAt: board.updatedAt || prev?.updatedAt || Date.now(),
          createdAt: board.createdAt || prev?.createdAt || Date.now()
        })
      );
      byId.set(next.id, next);
    });
  });
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createMoodboardFromSelection(opts) {
  const {
    name,
    itemIds,
    items,
    pack,
    projectId = "",
    gridPreset = DEFAULT_GRID_PRESET
  } = opts || {};
  const ids = Array.isArray(itemIds) ? itemIds.filter(Boolean).map(String) : [];
  const unique = [...new Set(ids)].slice(0, MOODBOARD_SOFT_LIMIT);
  const vaultItems = unique
    .map((itemId) => (items || []).find((i) => i.id === itemId))
    .filter(Boolean);
  const aspectInputs = vaultItems.map((item) => ({
    id: item.id,
    aspect: guessAspect(item)
  }));
  const packed = typeof pack === "function" ? pack(aspectInputs, { preset: gridPreset, gap: 16, padding: 24, width: 1200 }) : [];
  const objects = packed.map((cell, index) =>
    normalizeMoodboardObject({
      id: id(),
      kind: "item",
      itemId: cell.id,
      x: cell.x,
      y: cell.y,
      w: cell.w,
      h: cell.h,
      sortOrder: index,
      zIndex: index
    })
  );
  const now = Date.now();
  return normalizeMoodboard({
    id: id(),
    name: String(name || "").trim().slice(0, 120) || "Untitled Moodboard",
    projectId: projectId || "",
    layoutMode: "smart_grid",
    gridPreset,
    gap: 16,
    padding: 24,
    visibility: "private",
    objects,
    createdAt: now,
    updatedAt: now
  });
}

export function createBlankMoodboard(name) {
  const now = Date.now();
  return normalizeMoodboard({
    id: id(),
    name: String(name || "").trim().slice(0, 120) || "Untitled Moodboard",
    layoutMode: "smart_grid",
    gridPreset: DEFAULT_GRID_PRESET,
    visibility: "private",
    objects: [],
    createdAt: now,
    updatedAt: now
  });
}

export function boardsUsingItem(moodboards, itemId) {
  const idStr = String(itemId || "");
  return (moodboards || []).filter((b) => (b.objects || []).some((o) => o.kind === "item" && o.itemId === idStr));
}

export function removeItemFromAllBoards(moodboards, itemId) {
  const idStr = String(itemId || "");
  return (moodboards || []).map((board) => {
    let changed = false;
    const nextObjects = (board.objects || []).map((o) => {
      if (o.kind === "item" && o.itemId === idStr) {
        changed = true;
        // Keep layout slot; UI shows “Reference unavailable” when Vault item is gone.
        return Object.assign({}, o, { itemId: "" });
      }
      return o;
    });
    if (!changed) return board;
    return normalizeMoodboard(Object.assign({}, board, { objects: nextObjects, updatedAt: Date.now(), version: (board.version || 1) + 1 }));
  });
}

export function linkMoodboardToProject(board, projectId) {
  return normalizeMoodboard(Object.assign({}, board, { projectId: projectId || "", updatedAt: Date.now(), version: (board.version || 1) + 1 }));
}

export function moodboardItemCount(board) {
  return (board?.objects || []).filter((o) => o.kind === "item" && o.itemId).length;
}

function guessAspect(item) {
  if (!item) return 1;
  if (item.type === "link" || item.type === "note") return 1.4;
  return 0.85;
}

export function trackMoodboardEvent(name, payload) {
  try {
    const safe = payload && typeof payload === "object" ? { ...payload } : {};
    delete safe.title;
    delete safe.name;
    delete safe.note;
    delete safe.sourceUrl;
    delete safe.url;
    if (typeof window !== "undefined" && window.__vaultAnalytics?.track) {
      window.__vaultAnalytics.track(name, safe);
    }
  } catch (_) {}
}
