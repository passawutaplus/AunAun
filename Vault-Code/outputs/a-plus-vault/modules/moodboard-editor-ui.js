import { connectorPath, paletteMode, pantoneChipLabel, normalizeHex, colorFormatRows, objectGroupId } from "./moodboard-model.js";
import { saveStatusLabel } from "./moodboard-autosave.js";

export function smartGridEditorMarkup(ctx) {
  const {
    board,
    items,
    esc,
    escA,
    icon,
    uiIcon,
    media,
    host,
    saveStatus,
    canUndo,
    canRedo,
    selectedObjectId,
    selectedObjectIds = [],
    tool = "select",
    sourceCollapsed = false,
    inspectorCollapsed = false,
    sourceWidth = 220,
    inspectorWidth = 260,
    zoom = 1
  } = ctx;
  const vaultById = new Map((items || []).map((i) => [i.id, i]));
  const status = saveStatusLabel(saveStatus || "idle");
  const nodes = (board.objects || []).filter((o) => o.kind !== "connector");
  const connectors = (board.objects || []).filter((o) => o.kind === "connector");
  const selectedSet = new Set((selectedObjectIds || []).map(String));
  if (selectedObjectId) selectedSet.add(String(selectedObjectId));
  const selectedNodes = nodes.filter((o) => selectedSet.has(o.id));
  const selectedGroupIds = [
    ...new Set(selectedNodes.map((o) => objectGroupId(o)).filter(Boolean))
  ];
  const canGroup = selectedNodes.length >= 2;
  const canUngroup = selectedGroupIds.length > 0 || selectedNodes.some((o) => objectGroupId(o));
  const layerRows = buildLayerList(nodes, vaultById, selectedSet, esc, escA);
  const gridItems = nodes
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex || a.sortOrder - b.sortOrder)
    .map((obj) =>
      smartGridCard(obj, vaultById.get(obj.itemId), esc, escA, media, host, selectedObjectId, selectedSet.has(obj.id), objectGroupId(obj))
    )
    .join("");
  const connectorSvg = connectorsMarkup(connectors, nodes, escA, selectedObjectId);
  const bodyCls = [
    "moodboard-editor-body", "mb2",
    sourceCollapsed ? "source-collapsed" : "",
    inspectorCollapsed ? "inspector-collapsed" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const toolBtn = (id, label, glyph, key) =>
    `<button type="button" class="mb-tool ${tool === id ? "active" : ""}" data-moodboard-tool="${id}" title="${label}${key ? " (" + key + ")" : ""}" aria-label="${label}">
      <span class="mb-tool-glyph" aria-hidden="true">${glyph}</span><span class="mb-tool-label">${label}</span>
    </button>`;
  const zoomPct = Math.round((Number(zoom) || 1) * 100);

  return `
<div class="moodboard-editor smart-grid-editor" data-moodboard-editor="${escA(board.id)}" data-moodboard-active-tool="${escA(tool)}" style="--mb-source-w:${Number(sourceWidth) || 220}px;--mb-inspector-w:${Number(inspectorWidth) || 260}px">
  <header class="moodboard-topbar mb-topbar">
    <div class="moodboard-topbar-left">
      <button type="button" class="mb-back" data-view="moodboards" title="Back to Moodboards" aria-label="Back to Moodboards"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg></button><span class="mb-crumb">Moodboards</span>
      <input class="moodboard-title-input" data-moodboard-title value="${escA(board.name)}" maxlength="120" aria-label="Board title">
      <span class="moodboard-save-status" data-moodboard-save-status data-status="${escA(saveStatus || "idle")}">${esc(status)}</span>
    </div>
    <div class="mb-topbar-center">
      <button type="button" class="icon-button" data-moodboard-undo title="Undo (Ctrl+Z)" aria-label="Undo" ${canUndo ? "" : "disabled"}>${uiIcon ? uiIcon("undo") || "↶" : "↶"}</button>
      <button type="button" class="icon-button" data-moodboard-redo title="Redo (Ctrl+Shift+Z)" aria-label="Redo" ${canRedo ? "" : "disabled"}>${uiIcon ? uiIcon("redo") || "↷" : "↷"}</button>
    </div>
    <div class="moodboard-topbar-right">
      <div class="mb-zoom" role="group" aria-label="Zoom">
        <button type="button" class="icon-button mini" data-mb-zoom="out" title="Zoom out" aria-label="Zoom out">&minus;</button>
        <button type="button" class="mb-zoom-pct" data-mb-zoom="reset" title="Reset to 100%" data-mb-zoom-label>${zoomPct}%</button>
        <button type="button" class="icon-button mini" data-mb-zoom="in" title="Zoom in" aria-label="Zoom in">+</button>
        <button type="button" class="icon-button mini" data-mb-zoom="fit" title="Fit all objects" aria-label="Fit all objects"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/></svg></button>
      </div>
      <button type="button" class="icon-button mb-layers-toggle${sourceCollapsed ? "" : " is-on"}" data-toggle-moodboard-source title="Layers" aria-label="Layers" aria-pressed="${sourceCollapsed ? "false" : "true"}"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 16.5 9 5 9-5"/></svg></button>
      <button type="button" class="icon-button" data-mb-present title="Present full screen" aria-label="Present full screen"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="m10 8 5 2-5 2z" fill="currentColor"/><path d="M8 20h8M12 16v4"/></svg></button>
      <details class="mb-export"><summary class="icon-button" title="Export" aria-label="Export"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m-4-4 4 4 4-4"/><path d="M5 19h14"/></svg></summary><div class="mb-export-menu"><button type="button" data-mb-export-png>PNG image</button><button type="button" data-export-moodboard="${escA(board.id)}">PDF (print)</button></div></details>
      <button type="button" class="icon-button" data-link-moodboard-project="${escA(board.id)}" title="Add to Project" aria-label="Add to Project"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h6l2 2h10v10H3z"/><path d="M12 12v4m-2-2h4"/></svg></button>
      <span class="mb-private" title="Private board" aria-label="Private board"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>
      <button type="button" class="icon-button mb-inspector-toggle${inspectorCollapsed ? "" : " is-on"}" data-toggle-moodboard-inspector title="${inspectorCollapsed ? "Show inspector" : "Hide inspector"}" aria-label="Toggle inspector"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg></button>
    </div>
  </header>
  <div class="${bodyCls}" data-moodboard-editor-body>
    <aside class="moodboard-source-panel moodboard-tools-panel mb-layers-panel" data-moodboard-source-panel>
      <div class="moodboard-panel-head">
        <p class="side-kicker">Layers</p>
        <button type="button" class="icon-button mini" data-toggle-moodboard-source title="Hide layers" aria-label="Hide layers">${icon("close")}</button>
      </div>
      <div class="moodboard-panel-scroll">
        <div class="moodboard-a11y-list" aria-label="Layers">
          <div class="moodboard-layer-head">
            <div class="moodboard-layer-tools">
              <button type="button" class="ghost-button mini" data-moodboard-group ${canGroup ? "" : "disabled"} title="Group selected">Group</button>
              <button type="button" class="ghost-button mini" data-moodboard-ungroup ${canUngroup ? "" : "disabled"} title="Ungroup">Ungroup</button>
            </div>
          </div>
          <p class="settings-field-hint moodboard-layer-hint">Shift / Ctrl + click to select several, then Group.</p>
          <ol class="moodboard-layer-list">${layerRows}</ol>
        </div>
      </div>
    </aside>
    <button type="button" class="moodboard-resize-handle source-resize" data-resize-moodboard-source title="Drag to resize tools" aria-label="Resize tools panel"><span></span></button>
    <main class="moodboard-canvas-wrap" data-mb-canvas-wrap>
      <div class="smart-grid-canvas moodboard-dot-grid" data-smart-grid-canvas style="zoom:${Number(zoom) || 1};--board-gap:${board.gap || 16}px;--board-pad:${board.padding || 24}px;min-width:${Math.max(board.width || 1200, canvasExtent(nodes, "w"))}px;min-height:${Math.max(board.height || 900, canvasExtent(nodes, "h"))}px">
        <svg class="moodboard-connectors" data-moodboard-connectors aria-hidden="true">${connectorSvg}</svg>
        ${gridItems || `<div class="smart-grid-empty"><p>Use tools on the left, or drop images from your computer onto the canvas.</p></div>`}
        <div class="moodboard-drop-hint" data-moodboard-drop-hint hidden><strong>Drop to upload</strong><span>Saves to My Vault + adds to this board</span></div>
      </div>
    </main>
    <div class="mb-toolbar" role="toolbar" aria-label="Moodboard tools">
      ${toolBtn("select", "Select", `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 3 14 7-6 2-2 6z"/></svg>`, "V")}
      ${toolBtn("image", "Add from Vault", `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/></svg>`, "I")}
      ${toolBtn("upload", "Upload", `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>`, "U")}
      <span class="mb-toolbar-sep" aria-hidden="true"></span>
      ${toolBtn("text", "Text", `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7V4h14v3M12 4v16m-3 0h6"/></svg>`, "T")}
      ${toolBtn("color", "Color", `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>`, "C")}
      ${toolBtn("todo", "To-do", `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 3 3 5-6"/></svg>`)}
      ${toolBtn("frame", "Frame", `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v18M17 3v18M3 7h18M3 17h18"/></svg>`, "F")}
      ${toolBtn("connector", "Connect", `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c0-8 5-13 13-13"/><path d="m14 3 4 3-3 4"/></svg>`)}
      <input type="file" class="moodboard-upload-input" data-moodboard-upload accept="image/jpeg,image/png,image/webp" multiple hidden>
    </div>
    <button type="button" class="moodboard-resize-handle inspector-resize" data-resize-moodboard-inspector title="Drag to resize inspector" aria-label="Resize inspector"><span></span></button>
    <aside class="moodboard-inspector" data-moodboard-inspector-panel>
      <div class="moodboard-panel-head">
        <p class="side-kicker">Inspector</p>
        <button type="button" class="icon-button mini" data-toggle-moodboard-inspector title="${inspectorCollapsed ? "Expand inspector" : "Collapse inspector"}" aria-label="${inspectorCollapsed ? "Expand inspector" : "Collapse inspector"}">${icon(inspectorCollapsed ? "collapse" : "expand")}</button>
      </div>
      <div class="moodboard-panel-scroll">
        ${inspectorMarkup(board, selectedObjectId, vaultById, esc, escA)}
      </div>
    </aside>
  </div>
</div>`;
}

function layerThumb(o, vaultById, escA) {
  if (o.kind === "palette") {
    const c = (o.colors && o.colors[0]) || o.color || "#888";
    return `<span class="mb-layer-thumb" style="background:${escA(c)}"></span>`;
  }
  if (o.kind === "item") {
    const it = vaultById.get(o.itemId);
    const src = it && (it.thumbnailUrl || it.previewUrl || (it.type === "image" ? it.assetUrl : ""));
    return src ? `<span class="mb-layer-thumb" style="background-image:url('${escA(src)}')"></span>` : `<span class="mb-layer-thumb is-blank"></span>`;
  }
  const glyph = o.kind === "text" || o.kind === "note" ? "T" : o.kind === "todo" ? "☑" : o.kind === "frame" ? "▢" : "·";
  return `<span class="mb-layer-thumb is-glyph">${glyph}</span>`;
}

function objectLayerLabel(o, vaultById) {
  const item = vaultById.get(o.itemId);
  if (o.kind === "text" || o.kind === "note") return "Text";
  if (o.kind === "todo") return o.text || "To-do";
  if (o.kind === "palette") {
    return paletteMode(o) === "swatch"
      ? pantoneChipLabel(o.colors?.[0] || o.color, o.text)
      : "Palette";
  }
  if (o.kind === "frame") return o.text || "Frame";
  return item?.title || "Unavailable";
}

function buildLayerList(nodes, vaultById, selectedSet, esc, escA) {
  const ordered = nodes
    .slice()
    .sort((a, b) => (Number(b.zIndex) || 0) - (Number(a.zIndex) || 0) || (Number(b.sortOrder) || 0) - (Number(a.sortOrder) || 0));
  const seenGroups = new Set();
  const rows = [];
  let index = 0;
  ordered.forEach((o) => {
    const gid = objectGroupId(o);
    if (gid) {
      if (seenGroups.has(gid)) return;
      seenGroups.add(gid);
      const members = ordered.filter((x) => objectGroupId(x) === gid);
      const anySelected = members.some((m) => selectedSet.has(m.id));
      index += 1;
      rows.push(`<li class="moodboard-layer-group ${anySelected ? "is-selected" : ""}" data-layer-group="${escA(gid)}" data-layer-unit="g:${escA(gid)}" draggable="true">
        <button type="button" class="moodboard-layer-group-toggle" data-select-board-group="${escA(gid)}" title="Select group">
          <span class="moodboard-layer-index">${index}.</span>
          <span class="moodboard-layer-label">Group · ${members.length}</span>
        </button>
        <ol class="moodboard-layer-children">
          ${members
            .map((m) => {
              const lab = objectLayerLabel(m, vaultById);
              return `<li class="${selectedSet.has(m.id) ? "is-selected" : ""}">
                <button type="button" data-select-board-obj="${escA(m.id)}" title="${escA(lab)}">
                  ${layerThumb(m, vaultById, escA)}<span class="moodboard-layer-label">${esc(lab)}</span>
                </button>
              </li>`;
            })
            .join("")}
        </ol>
      </li>`);
      return;
    }
    index += 1;
    const label = objectLayerLabel(o, vaultById);
    rows.push(`<li class="${selectedSet.has(o.id) ? "is-selected" : ""}" data-layer-unit="o:${escA(o.id)}" draggable="true">
      <button type="button" data-select-board-obj="${escA(o.id)}" title="${escA(label)}">
        ${layerThumb(o, vaultById, escA)}
        <span class="moodboard-layer-label">${esc(label)}</span>
      </button>
    </li>`);
  });
  return rows.join("") || `<li class="moodboard-layer-empty">ไม่มี object บนบอร์ด</li>`;
}

function connectorsMarkup(connectors, nodes, escA, selectedObjectId) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return connectors
    .map((c) => {
      const from = byId.get(c.fromId);
      const to = byId.get(c.toId);
      if (!from || !to) return "";
      const { d } = connectorPath(from, to);
      const color = escA(c.color || "#ff4f43");
      const selected = selectedObjectId === c.id ? " selected" : "";
      const mid = `mba-${escA(c.id)}`;
      return `<g class="moodboard-connector${selected}" data-board-obj="${escA(c.id)}" data-connector-id="${escA(c.id)}">
        <defs><marker id="${mid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 9 5 1 9z" fill="${color}"/></marker></defs>
        <path class="connector-hit" d="${d}" fill="none" />
        <path class="connector-line" d="${d}" fill="none" stroke="${color}" marker-end="url(#${mid})" />
      </g>`;
    })
    .join("");
}

function objectChrome(objId, selected, escA) {
  const remove = `<button type="button" class="icon-button mini" data-remove-board-obj="${escA(objId)}" title="Remove from board">×</button>`;
  const handles = ["n", "e", "s", "w"]
    .map((side) => `<button type="button" class="mb-conn-handle side-${side}" data-mb-conn="${escA(objId)}" data-mb-side="${side}" title="Drag to connect" aria-label="Drag to connect to another object"></button>`)
    .join("");
  if (!selected) return remove + handles;
  const grips = ["nw", "n", "ne", "e", "se", "s", "sw", "w"]
    .map(
      (c) =>
        `<button type="button" class="moodboard-resize-grip corner-${c}" data-resize-board-obj="${escA(objId)}" data-resize-corner="${c}" title="Resize" aria-label="Resize ${c}"></button>`
    )
    .join("");
  const bar = `<div class="mb-selbar" role="toolbar" aria-label="Object actions">
    <button type="button" data-mb-duplicate="${escA(objId)}" title="Duplicate" aria-label="Duplicate">⧉</button>
    <button type="button" data-layer-board-obj="${escA(objId)}" data-layer-action="front" title="Bring to front" aria-label="Bring to front">⤒</button>
    <button type="button" data-layer-board-obj="${escA(objId)}" data-layer-action="back" title="Send to back" aria-label="Send to back">⤓</button>
    <button type="button" class="is-danger" data-remove-board-obj="${escA(objId)}" title="Remove from board" aria-label="Remove from board">✕</button>
  </div>`;
  const dots = ["n", "e", "s", "w"]
    .map((side) => `<button type="button" class="mb-conn-handle side-${side}" data-mb-conn="${escA(objId)}" data-mb-side="${side}" title="Drag to connect" aria-label="Drag to connect to another object"></button>`)
    .join("");
  return `${remove}${bar}${dots}<div class="moodboard-resize-frame" aria-hidden="true"></div>${grips}<span class="moodboard-size-badge" data-size-badge="${escA(objId)}" hidden></span>`;
}

const mbSvg = (inner, fill) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="${fill ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const ARRANGE_ICONS = {
  front: mbSvg(`<rect x="4" y="4" width="11" height="11" rx="2" opacity=".45"/><rect x="9" y="9" width="11" height="11" rx="2" fill="currentColor"/>`),
  forward: mbSvg(`<path d="M12 19V6m-5 5 5-5 5 5"/>`),
  backward: mbSvg(`<path d="M12 5v13m-5-5 5 5 5-5"/>`),
  back: mbSvg(`<rect x="4" y="4" width="11" height="11" rx="2" fill="currentColor"/><rect x="9" y="9" width="11" height="11" rx="2" opacity=".6"/>`),
  left: mbSvg(`<path d="M4 3v18"/><rect x="7" y="6" width="13" height="4" rx="1"/><rect x="7" y="14" width="8" height="4" rx="1"/>`),
  center: mbSvg(`<path d="M12 3v18"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>`),
  right: mbSvg(`<path d="M20 3v18"/><rect x="4" y="6" width="13" height="4" rx="1"/><rect x="9" y="14" width="8" height="4" rx="1"/>`),
  top: mbSvg(`<path d="M3 4h18"/><rect x="6" y="7" width="4" height="13" rx="1"/><rect x="14" y="7" width="4" height="8" rx="1"/>`),
  middle: mbSvg(`<path d="M3 12h18"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>`),
  bottom: mbSvg(`<path d="M3 20h18"/><rect x="6" y="5" width="4" height="12" rx="1"/><rect x="14" y="9" width="4" height="8" rx="1"/>`)
};

function layerActions(objId, escA, opts) {
  const options = opts || {};
  if (options.layersOnly === false && options.align === false) return "";
  const layerBtn = (action, label) =>
    `<button type="button" class="mb-ico-btn" data-layer-board-obj="${escA(objId)}" data-layer-action="${action}" title="${label}" aria-label="${label}">${ARRANGE_ICONS[action]}</button>`;
  const alignBtn = (action, label) =>
    `<button type="button" class="mb-ico-btn" data-align-board-obj="${escA(objId)}" data-align-action="${action}" title="${label}" aria-label="${label}">${ARRANGE_ICONS[action]}</button>`;
  const layers = options.layers === false
    ? ""
    : `<div class="mb-ico-group" role="group" aria-label="Layer order">
      ${layerBtn("front", "Bring to front")}${layerBtn("forward", "Bring forward")}${layerBtn("backward", "Send backward")}${layerBtn("back", "Send to back")}
    </div>`;
  const align = options.align === false
    ? ""
    : `<div class="mb-ico-group" role="group" aria-label="Align on board">
      ${alignBtn("left", "Align left")}${alignBtn("center", "Align center")}${alignBtn("right", "Align right")}${alignBtn("top", "Align top")}${alignBtn("middle", "Align middle")}${alignBtn("bottom", "Align bottom")}
    </div>`;
  return `<div class="moodboard-arrange">
    <p class="side-kicker">Arrange</p>
    ${layers}
    ${align}
  </div>`;
}

function smartGridCard(obj, item, esc, escA, media, host, selectedObjectId, isSelected, groupId) {
  const selected = isSelected || selectedObjectId === obj.id ? " selected" : "";
  const grouped = groupId ? " is-grouped" : "";
  const chrome = objectChrome(obj.id, !!(isSelected || selectedObjectId === obj.id), escA);
  const groupAttr = groupId ? ` data-board-group="${escA(groupId)}"` : "";
  if (obj.kind === "frame") {
    return `<article class="smart-grid-item frame-item${selected}${grouped}" data-board-obj="${escA(obj.id)}"${groupAttr} data-sort="${obj.sortOrder}" style="left:${obj.x}px;top:${obj.y}px;width:${obj.w}px;height:${obj.h}px;z-index:${obj.zIndex || 0};--frame-color:${escA(obj.color || "#ff4f43")}" tabindex="0">
      <header class="frame-label"><span>${esc(obj.text || "Section")}</span></header>
      ${chrome}
    </article>`;
  }
  if (obj.kind === "todo") {
    const tasks = Array.isArray(obj.style?.tasks) ? obj.style.tasks : [];
    const rows = tasks
      .map(
        (t) => `<label class="todo-row ${t.done ? "is-done" : ""}">
        <input type="checkbox" data-todo-check="${escA(obj.id)}" data-task-id="${escA(t.id)}" ${t.done ? "checked" : ""}>
        <input type="text" data-todo-text="${escA(obj.id)}" data-task-id="${escA(t.id)}" value="${escA(t.text || "")}" placeholder="Add a task…">
      </label>`
      )
      .join("");
    return `<article class="smart-grid-item todo-item${selected}${grouped}" data-board-obj="${escA(obj.id)}"${groupAttr} data-sort="${obj.sortOrder}" style="left:${obj.x}px;top:${obj.y}px;width:${obj.w}px;height:${obj.h}px;z-index:${obj.zIndex || 1}" tabindex="0">
      <header class="todo-head"><strong>${esc(obj.text || "To-do")}</strong></header>
      <div class="todo-list">${rows}</div>
      <button type="button" class="todo-add" data-todo-add="${escA(obj.id)}">+ Add task</button>
      ${chrome}
    </article>`;
  }
  if (obj.kind === "text" || obj.kind === "note") {
    const bg = textBackground(obj);
    const ink = textInkColor(bg);
    return `<article class="smart-grid-item text-item${selected}${grouped}" data-board-obj="${escA(obj.id)}"${groupAttr} data-sort="${obj.sortOrder}" style="left:${obj.x}px;top:${obj.y}px;width:${obj.w}px;height:${obj.h}px;z-index:${obj.zIndex || 1};--text-bg:${escA(bg)};--text-ink:${escA(ink)}" tabindex="0">
      <textarea data-board-text="${escA(obj.id)}" style="color:${escA(ink)}">${esc(obj.text || "")}</textarea>
      ${chrome}
    </article>`;
  }
  if (obj.kind === "palette") {
    const colors = obj.colors || [];
    const mode = paletteMode(obj);
    if (mode === "swatch") {
      const hex = normalizeHex(colors[0] || obj.color || "#ff4f43");
      const label = pantoneChipLabel(hex, obj.text);
      return `<article class="smart-grid-item color-item pantone-chip${selected}${grouped}" data-board-obj="${escA(obj.id)}"${groupAttr} data-sort="${obj.sortOrder}" style="left:${obj.x}px;top:${obj.y}px;width:${obj.w}px;height:${obj.h}px;z-index:${obj.zIndex || 1};--swatch:${escA(hex)}" tabindex="0">
        <div class="pantone-chip-face" aria-hidden="true"></div>
        <div class="pantone-chip-meta">
          <strong>${esc(label)}</strong>
          <span>${esc(hex.toUpperCase())}</span>
        </div>
        ${chrome}
      </article>`;
    }
    return `<article class="smart-grid-item color-item palette-strip${selected}${grouped}" data-board-obj="${escA(obj.id)}"${groupAttr} data-sort="${obj.sortOrder}" style="left:${obj.x}px;top:${obj.y}px;width:${obj.w}px;height:${obj.h}px;z-index:${obj.zIndex || 1}" tabindex="0">
      <div class="color-swatch-row">${colors.map((c) => `<span style="background:${escA(c)}" title="${escA(c)}"></span>`).join("")}</div>
      ${chrome}
    </article>`;
  }
  if (!item) {
    return `<article class="smart-grid-item missing-item${selected}${grouped}" data-board-obj="${escA(obj.id)}"${groupAttr} data-sort="${obj.sortOrder}" style="left:${obj.x}px;top:${obj.y}px;width:${obj.w}px;height:${obj.h}px;z-index:${obj.zIndex || 1}" tabindex="0">
      <strong>Reference unavailable</strong>
      <p>Removed from My Vault. Board layout kept.</p>
      ${chrome}
    </article>`;
  }
  const domain = host(item.sourceUrl) || item.type;
  return `<article class="smart-grid-item vault-item${selected}${grouped}" data-board-obj="${escA(obj.id)}"${groupAttr} data-vault-item="${escA(item.id)}" data-sort="${obj.sortOrder}" style="left:${obj.x}px;top:${obj.y}px;width:${obj.w}px;height:${obj.h}px;z-index:${obj.zIndex || 1}" tabindex="0">
    <div class="smart-grid-media">${media(item)}</div>
    <div class="smart-grid-meta">
      <strong>${esc(item.title)}</strong>
      <small class="source-badge">${esc(domain)}</small>
      ${item.sourceUrl && !String(item.sourceUrl).startsWith("upload://") ? `<a href="${escA(item.sourceUrl)}" target="_blank" rel="noreferrer">Open source</a>` : ""}
    </div>
    ${chrome}
  </article>`;
}

function inspectorMarkup(board, selectedObjectId, vaultById, esc, escA) {
  const obj = (board.objects || []).find((o) => o.id === selectedObjectId);
  if (!obj) {
    return `<div class="drawer-inner"><h2>Board</h2>
      <p class="inspector-empty">Private board · ${moodboardItemCountSafe(board)} references</p>
      <p class="settings-field-hint">Select an item to edit. Removing an item keeps it in My Vault.</p>
    </div>`;
  }
  if (obj.kind === "connector") {
    return `<div class="drawer-inner"><h2>Connector</h2>
      <p class="settings-field-hint">Links two objects. Drag nodes freely — the line follows.</p>
      <button type="button" class="danger-button wide" data-remove-board-obj="${escA(obj.id)}">Remove connector</button>
    </div>`;
  }
  if (obj.kind === "frame") {
    return `<div class="drawer-inner"><h2>Frame</h2>
      <label class="app-dialog-field"><span>Label</span><input data-board-frame-label="${escA(obj.id)}" value="${escA(obj.text || "Section")}" maxlength="80"></label>
      <label class="app-dialog-field"><span>Accent</span>
        <input type="color" data-board-frame-color="${escA(obj.id)}" value="${escA(obj.color || "#ff4f43")}" aria-label="Frame accent color">
      </label>
      <p class="settings-field-hint">Use frames to group refs like Logo, Palette, or Do / Don’t.</p>
      ${layerActions(obj.id, escA)}
      <button type="button" class="danger-button wide" data-remove-board-obj="${escA(obj.id)}">Remove frame</button>
    </div>`;
  }
  if (obj.kind === "todo") {
    const tasks = Array.isArray(obj.style?.tasks) ? obj.style.tasks : [];
    const done = tasks.filter((t) => t.done).length;
    return `<div class="drawer-inner"><h2>To-do</h2>
      <label class="app-dialog-field"><span>Title</span><input data-board-todo-title="${escA(obj.id)}" value="${escA(obj.text || "To-do")}" maxlength="80"></label>
      <p class="settings-field-hint">${done}/${tasks.length} done · edit tasks on the board card.</p>
      ${layerActions(obj.id, escA)}
      <button type="button" class="danger-button wide" data-remove-board-obj="${escA(obj.id)}">Remove to-do</button>
    </div>`;
  }
  if (obj.kind === "text" || obj.kind === "note") {
    const bg = textBackground(obj);
    const presets = ["#ffffff", "#ffe08a", "#ffd6cc", "#d4edda", "#cce5ff", "#1a1e24"];
    return `<div class="drawer-inner"><h2>Text</h2>
      <label class="app-dialog-field"><span>Content</span><textarea data-board-text="${escA(obj.id)}">${esc(obj.text || "")}</textarea></label>
      <label class="app-dialog-field"><span>Background</span>
        <input type="color" data-board-text-bg="${escA(obj.id)}" value="${escA(bg)}" aria-label="Text background color">
      </label>
      <div class="moodboard-bg-presets" role="group" aria-label="Background presets">
        ${presets
          .map(
            (c) =>
              `<button type="button" class="moodboard-bg-swatch${bg.toLowerCase() === c.toLowerCase() ? " active" : ""}" data-board-text-bg-preset="${escA(obj.id)}" data-color="${escA(c)}" style="background:${escA(c)}" title="${escA(c)}" aria-label="${escA(c)}"></button>`
          )
          .join("")}
      </div>
      ${layerActions(obj.id, escA)}
      <button type="button" class="danger-button wide" data-remove-board-obj="${escA(obj.id)}">Remove from board</button>
    </div>`;
  }
  if (obj.kind === "palette") {
    const mode = paletteMode(obj);
    const colors = obj.colors || [];
    if (mode === "swatch") {
      const hex = normalizeHex(colors[0] || obj.color || "#ff4f43");
      const label = pantoneChipLabel(hex, obj.text);
      const codes = colorFormatRows(hex);
      return `<div class="drawer-inner"><h2>Pantone chip</h2>
        <label class="moodboard-pantone-preview is-editable" style="--swatch:${escA(hex)}" title="Click to change color">
          <span class="pantone-chip-face" aria-hidden="true"></span>
          <span class="pantone-chip-meta">
            <strong>${esc(label)}</strong>
            <span>${esc(hex.toUpperCase())}</span>
          </span>
          <span class="pantone-edit-hint">แตะสีเพื่อเปลี่ยน</span>
          <input type="color" class="pantone-hidden-picker" data-board-swatch-color="${escA(obj.id)}" value="${escA(hex)}" aria-label="Change chip color">
        </label>
        <div class="moodboard-color-codes" aria-label="Color codes">
          ${codes
            .map(
              (row) => `<div class="moodboard-color-code-row">
              <span class="moodboard-color-code-label">${esc(row.label)}</span>
              <button type="button" class="moodboard-color-code-copy" data-copy-color="${escA(row.copy)}" title="Copy ${escA(row.label)}">
                <strong>${esc(row.value)}</strong>
                <span>Copy</span>
              </button>
            </div>`
            )
            .join("")}
        </div>
        <p class="settings-field-hint">คัดลอกโค้ดไปปรับเข้ม/อ่อนในเครื่องมืออื่นได้</p>
        <label class="app-dialog-field"><span>Name</span><input data-board-swatch-name="${escA(obj.id)}" value="${escA(obj.text || "")}" maxlength="48" placeholder="${escA(pantoneChipLabel(hex, ""))}"></label>
        ${layerActions(obj.id, escA)}
        <button type="button" class="danger-button wide" data-remove-board-obj="${escA(obj.id)}">Remove from board</button>
      </div>`;
    }
    const slots = colors.slice(0, 8);
    return `<div class="drawer-inner"><h2>Palette</h2>
      <p class="settings-field-hint">เรียงหลายสีเป็นแถว — ใส่ได้ถึง 8 สี</p>
      <div class="moodboard-palette-editor">
        ${slots
          .map(
            (c, i) => `<label class="moodboard-palette-slot">
            <input type="color" data-board-palette-color="${escA(obj.id)}" data-color-index="${i}" value="${escA(c)}" aria-label="Palette color ${i + 1}">
            <button type="button" class="ghost-button mini" data-board-palette-remove="${escA(obj.id)}" data-color-index="${i}" title="Remove" ${slots.length <= 2 ? "disabled" : ""}>×</button>
          </label>`
          )
          .join("")}
      </div>
      <button type="button" class="ghost-button wide" data-board-palette-add="${escA(obj.id)}" ${colors.length >= 8 ? "disabled" : ""}>+ Add color</button>
      ${layerActions(obj.id, escA)}
      <button type="button" class="danger-button wide" data-remove-board-obj="${escA(obj.id)}">Remove from board</button>
    </div>`;
  }
  const item = vaultById.get(obj.itemId);
  const itemColors = (item?.analysis?.colors || [])
    .map((c) => normalizeHex(c, ""))
    .filter(Boolean)
    .slice(0, 8);
  const colorSection = item
    ? `<div class="moodboard-extract-colors">
      <p class="side-kicker">Colors</p>
      ${
        itemColors.length
          ? `<div class="moodboard-extract-swatches" role="list">
        ${itemColors
          .map(
            (c) => `<button type="button" class="moodboard-extract-swatch" role="listitem" data-add-color-from-item="${escA(obj.id)}" data-color-mode="swatch" data-color="${escA(c)}" style="--swatch:${escA(c)}" title="Add Pantone chip ${escA(c.toUpperCase())}" aria-label="Add Pantone chip ${escA(c.toUpperCase())}">
            <span class="moodboard-extract-swatch-face"></span>
            <span class="moodboard-extract-swatch-hex">${esc(c.toUpperCase())}</span>
          </button>`
          )
          .join("")}
      </div>
      <div class="moodboard-extract-actions">
        <button type="button" class="ghost-button wide" data-add-color-from-item="${escA(obj.id)}" data-color-mode="palette">+ Add palette</button>
        <button type="button" class="ghost-button wide" data-add-color-from-item="${escA(obj.id)}" data-color-mode="swatches">+ Add all as chips</button>
      </div>
      <p class="settings-field-hint">กดสีเพื่อเป็น Pantone chip หรือเพิ่มทั้งชุดเป็นพาเลท</p>`
          : `<p class="settings-field-hint">ยังไม่มีสีจากภาพ — เพิ่มเองได้</p>
      <div class="moodboard-extract-actions">
        <button type="button" class="ghost-button wide" data-add-color-from-item="${escA(obj.id)}" data-color-mode="palette">+ Add palette</button>
        <button type="button" class="ghost-button wide" data-add-color-from-item="${escA(obj.id)}" data-color-mode="swatch">+ Add Pantone chip</button>
      </div>`
      }
    </div>`
    : "";
  return `<div class="drawer-inner"><h2>${esc(item?.title || "Reference")}</h2>
    <p class="detail-subline">${esc(item ? "Stored in My Vault" : "Reference unavailable")}</p>
    ${item?.sourceUrl && !String(item.sourceUrl).startsWith("upload://") ? `<p><a href="${escA(item.sourceUrl)}" target="_blank" rel="noreferrer">Open source</a></p>` : ""}
    ${colorSection}
    ${layerActions(obj.id, escA)}
    <button type="button" class="danger-button wide" data-remove-board-obj="${escA(obj.id)}">Remove from board</button>
  </div>`;
}

function moodboardItemCountSafe(board) {
  return (board.objects || []).filter((o) => o.kind === "item").length;
}

function textBackground(obj) {
  const styleBg = obj?.style && typeof obj.style === "object" ? obj.style.background : "";
  if (styleBg) return String(styleBg);
  if (obj?.kind === "note" && obj.color) return String(obj.color);
  return "#ffffff";
}

function textInkColor(bg) {
  const hex = String(bg || "#ffffff").replace("#", "");
  if (hex.length !== 6) return "#17191b";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.55 ? "#f4f6f8" : "#17191b";
}

function canvasExtent(nodes, axis) {
  const pad = 80;
  let max = axis === "w" ? 1200 : 900;
  (nodes || []).forEach((o) => {
    const edge = axis === "w" ? Number(o.x || 0) + Number(o.w || 0) : Number(o.y || 0) + Number(o.h || 0);
    if (edge + pad > max) max = edge + pad;
  });
  return Math.round(max);
}
