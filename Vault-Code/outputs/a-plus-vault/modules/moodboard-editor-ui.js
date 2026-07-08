import { paletteMode, pantoneChipLabel, normalizeHex, colorFormatRows, objectGroupId } from "./moodboard-model.js";
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
    inspectorWidth = 260
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
    "moodboard-editor-body",
    sourceCollapsed ? "source-collapsed" : "",
    inspectorCollapsed ? "inspector-collapsed" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const toolBtn = (id, label, glyph) =>
    `<button type="button" class="moodboard-tool-btn ${tool === id ? "active" : ""}" data-moodboard-tool="${id}" title="${label}" aria-label="${label}">
      <span class="moodboard-tool-glyph" aria-hidden="true">${glyph}</span>
      <span>${label}</span>
    </button>`;

  return `
<div class="moodboard-editor smart-grid-editor" data-moodboard-editor="${escA(board.id)}" data-moodboard-active-tool="${escA(tool)}" style="--mb-source-w:${Number(sourceWidth) || 220}px;--mb-inspector-w:${Number(inspectorWidth) || 260}px">
  <header class="moodboard-topbar">
    <div class="moodboard-topbar-left">
      <button type="button" class="ghost-button" data-view="moodboards">${icon("close")}<span>Moodboards</span></button>
      <input class="moodboard-title-input" data-moodboard-title value="${escA(board.name)}" maxlength="120" aria-label="Board title">
      <span class="moodboard-save-status" data-moodboard-save-status data-status="${escA(saveStatus || "idle")}">${esc(status)}</span>
    </div>
    <div class="moodboard-topbar-right">
      <button type="button" class="icon-button" data-toggle-moodboard-source title="${sourceCollapsed ? "Expand tools" : "Collapse tools"}" aria-label="${sourceCollapsed ? "Expand tools" : "Collapse tools"}">${icon(sourceCollapsed ? "expand" : "collapse")}</button>
      <button type="button" class="icon-button" data-moodboard-undo title="Undo" ${canUndo ? "" : "disabled"}>${uiIcon ? uiIcon("undo") || "↶" : "↶"}</button>
      <button type="button" class="icon-button" data-moodboard-redo title="Redo" ${canRedo ? "" : "disabled"}>${uiIcon ? uiIcon("redo") || "↷" : "↷"}</button>
      <button type="button" class="ghost-button" data-link-moodboard-project="${escA(board.id)}">Add to Project</button>
      <span class="status-pill">Private</span>
      <button type="button" class="icon-button" data-toggle-moodboard-inspector title="${inspectorCollapsed ? "Expand inspector" : "Collapse inspector"}" aria-label="${inspectorCollapsed ? "Expand inspector" : "Collapse inspector"}">${icon(inspectorCollapsed ? "collapse" : "expand")}</button>
    </div>
  </header>
  <div class="${bodyCls}" data-moodboard-editor-body>
    <aside class="moodboard-source-panel moodboard-tools-panel" data-moodboard-source-panel>
      <div class="moodboard-panel-head">
        <div>
          <p class="side-kicker">Tools</p>
          <p class="settings-field-hint">Add objects, then drag freely on the canvas.</p>
        </div>
        <button type="button" class="icon-button mini" data-toggle-moodboard-source title="${sourceCollapsed ? "Expand tools" : "Collapse to icons"}" aria-label="${sourceCollapsed ? "Expand tools" : "Collapse to icons"}">${icon(sourceCollapsed ? "expand" : "collapse")}</button>
      </div>
      <div class="moodboard-panel-scroll">
        <div class="moodboard-tool-list" role="toolbar" aria-label="Moodboard tools">
          ${toolBtn("select", "Select", "⌖")}
          ${toolBtn("image", "Add image", "▣")}
          ${toolBtn("upload", "Upload", "⇪")}
          ${toolBtn("text", "Text", "T")}
          ${toolBtn("todo", "To-do", "☑")}
          ${toolBtn("color", "Color", "◐")}
          ${toolBtn("connector", "Connect", "⟷")}
          ${toolBtn("frame", "Frame", "▢")}
        </div>
        <input type="file" class="moodboard-upload-input" data-moodboard-upload accept="image/jpeg,image/png,image/webp" multiple hidden>
        <div class="moodboard-a11y-list" aria-label="Layers">
          <div class="moodboard-layer-head">
            <p class="side-kicker">Layer</p>
            <div class="moodboard-layer-tools">
              <button type="button" class="ghost-button mini" data-moodboard-group ${canGroup ? "" : "disabled"} title="Group selected">Group</button>
              <button type="button" class="ghost-button mini" data-moodboard-ungroup ${canUngroup ? "" : "disabled"} title="Ungroup">Ungroup</button>
            </div>
          </div>
          <p class="settings-field-hint moodboard-layer-hint">Shift/Ctrl คลิกเพื่อเลือกหลายชั้น แล้ว Group</p>
          <ol class="moodboard-layer-list">${layerRows}</ol>
        </div>
      </div>
    </aside>
    <button type="button" class="moodboard-resize-handle source-resize" data-resize-moodboard-source title="Drag to resize tools" aria-label="Resize tools panel"><span></span></button>
    <main class="moodboard-canvas-wrap">
      <div class="smart-grid-canvas moodboard-dot-grid" data-smart-grid-canvas style="--board-gap:${board.gap || 16}px;--board-pad:${board.padding || 24}px;min-width:${Math.max(board.width || 1200, canvasExtent(nodes, "w"))}px;min-height:${Math.max(board.height || 900, canvasExtent(nodes, "h"))}px">
        <svg class="moodboard-connectors" data-moodboard-connectors aria-hidden="true">${connectorSvg}</svg>
        ${gridItems || `<div class="smart-grid-empty"><p>Use tools on the left, or drop images from your computer onto the canvas.</p></div>`}
        <div class="moodboard-drop-hint" data-moodboard-drop-hint hidden><strong>Drop to upload</strong><span>Saves to Vault Library + adds to this board</span></div>
      </div>
    </main>
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
      rows.push(`<li class="moodboard-layer-group ${anySelected ? "is-selected" : ""}" data-layer-group="${escA(gid)}">
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
                  <span class="moodboard-layer-label">${esc(lab)}</span>
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
    rows.push(`<li class="${selectedSet.has(o.id) ? "is-selected" : ""}">
      <button type="button" data-select-board-obj="${escA(o.id)}" title="${escA(label)}">
        <span class="moodboard-layer-index">${index}.</span>
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
      const x1 = from.x + from.w / 2;
      const y1 = from.y + from.h / 2;
      const x2 = to.x + to.w / 2;
      const y2 = to.y + to.h / 2;
      const selected = selectedObjectId === c.id ? " selected" : "";
      return `<g class="moodboard-connector${selected}" data-board-obj="${escA(c.id)}" data-connector-id="${escA(c.id)}">
        <line class="connector-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />
        <line class="connector-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${escA(c.color || "#ff4f43")}" />
      </g>`;
    })
    .join("");
}

function objectChrome(objId, selected, escA) {
  const remove = `<button type="button" class="icon-button mini" data-remove-board-obj="${escA(objId)}" title="Remove from board">×</button>`;
  if (!selected) return remove;
  const grips = ["nw", "n", "ne", "e", "se", "s", "sw", "w"]
    .map(
      (c) =>
        `<button type="button" class="moodboard-resize-grip corner-${c}" data-resize-board-obj="${escA(objId)}" data-resize-corner="${c}" title="Resize" aria-label="Resize ${c}"></button>`
    )
    .join("");
  return `${remove}<div class="moodboard-resize-frame" aria-hidden="true"></div>${grips}<span class="moodboard-size-badge" data-size-badge="${escA(objId)}" hidden></span>`;
}

function layerActions(objId, escA, opts) {
  const options = opts || {};
  if (options.layersOnly === false && options.align === false) return "";
  const layers = options.layers === false
    ? ""
    : `<div class="moodboard-layer-actions">
      <button type="button" class="ghost-button" data-layer-board-obj="${escA(objId)}" data-layer-action="front" title="Bring to front">Bring to front</button>
      <button type="button" class="ghost-button" data-layer-board-obj="${escA(objId)}" data-layer-action="forward" title="Bring forward">Bring forward</button>
      <button type="button" class="ghost-button" data-layer-board-obj="${escA(objId)}" data-layer-action="backward" title="Send backward">Send backward</button>
      <button type="button" class="ghost-button" data-layer-board-obj="${escA(objId)}" data-layer-action="back" title="Send to back">Send to back</button>
    </div>`;
  const align = options.align === false
    ? ""
    : `<div class="moodboard-align-actions" role="group" aria-label="Align on board">
      <button type="button" class="ghost-button" data-align-board-obj="${escA(objId)}" data-align-action="left" title="Align left">◁ Left</button>
      <button type="button" class="ghost-button" data-align-board-obj="${escA(objId)}" data-align-action="center" title="Align horizontal center">⬌ Center</button>
      <button type="button" class="ghost-button" data-align-board-obj="${escA(objId)}" data-align-action="right" title="Align right">Right ▷</button>
      <button type="button" class="ghost-button" data-align-board-obj="${escA(objId)}" data-align-action="top" title="Align top">△ Top</button>
      <button type="button" class="ghost-button" data-align-board-obj="${escA(objId)}" data-align-action="middle" title="Align vertical middle">⬍ Middle</button>
      <button type="button" class="ghost-button" data-align-board-obj="${escA(objId)}" data-align-action="bottom" title="Align bottom">Bottom ▽</button>
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
      <p>Removed from Vault Library. Board layout kept.</p>
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
      <p class="settings-field-hint">Select an item to edit. Removing an item keeps it in Vault Library.</p>
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
    <p class="detail-subline">${esc(item ? "Stored in Vault Library" : "Reference unavailable")}</p>
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