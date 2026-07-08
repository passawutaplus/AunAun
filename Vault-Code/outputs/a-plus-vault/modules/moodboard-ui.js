import { moodboardItemCount, MOODBOARD_SOFT_LIMIT, DEFAULT_GRID_PRESET } from "./moodboard-model.js";

export function moodboardColorChooserMarkup(ctx) {
  const { escA, icon } = ctx;
  return `<div class="app-dialog-backdrop"><section class="app-dialog moodboard-color-chooser" role="dialog" aria-modal="true" aria-labelledby="moodboard-color-chooser-title">
    <div class="app-dialog-head">
      <div>
        <span class="section-label">Color</span>
        <h2 id="moodboard-color-chooser-title">Choose color type</h2>
      </div>
      <button class="icon-button" type="button" data-dialog-cancel>${icon("close")}</button>
    </div>
    <p class="app-dialog-message">เลือกแบบพาเลทหลายสี หรือชิปสีเดี่ยวแนว Pantone</p>
    <div class="moodboard-color-type-grid">
      <button type="button" class="moodboard-color-type-card" data-add-color-type="palette">
        <span class="moodboard-color-type-preview is-palette" aria-hidden="true">
          <i style="background:#ff4f43"></i><i style="background:#2f3133"></i><i style="background:#f8f6f2"></i><i style="background:#c56b4e"></i>
        </span>
        <strong>Palette</strong>
        <small>หลายสีเรียงแถว — ชุดสีบนบอร์ด</small>
      </button>
      <button type="button" class="moodboard-color-type-card" data-add-color-type="swatch">
        <span class="moodboard-color-type-preview is-swatch" aria-hidden="true">
          <i style="background:#ff4f43"></i>
          <em>PANTONE FF4-F43 C</em>
        </span>
        <strong>Pantone chip</strong>
        <small>สีเดี่ยว การ์ดแนว Pantone พร้อมชื่อสี</small>
      </button>
    </div>
    <div class="app-dialog-actions">
      <button class="ghost-button" type="button" data-dialog-cancel>Cancel</button>
    </div>
  </section></div>`;
}

export function moodboardListMarkup(ctx) {
  const { moodboards, projects, esc, escA, icon, emptyPrimary } = ctx;
  const cards = (moodboards || [])
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((board) => moodboardIndexCard(board, projects, esc, escA, icon))
    .join("");
  const empty = !moodboards || !moodboards.length;
  return `
<section class="page-head moodboard-page-head">
  <div>
    <h1>Moodboards</h1>
    <p>Turn saved references into a clear creative direction—without uploading again.</p>
  </div>
  <div class="page-head-actions">
    <button class="primary-button" type="button" data-open-create-moodboard>${icon("plus")}<span>Create Moodboard</span></button>
  </div>
</section>
${
  empty
    ? `<section class="empty-state moodboard-empty"><div>
        <h2>Turn saved references into a clear direction.</h2>
        <p>Select references from your Vault and arrange them into a board for yourself, your team, or your client.</p>
        <div class="empty-actions">
          <button class="primary-button" type="button" data-view="vault">${emptyPrimary || "Open Vault Library"}</button>
          <button class="primary-button" type="button" data-open-create-moodboard>${icon("plus")}<span>Create Moodboard</span></button>
        </div>
      </div></section>`
    : `<section class="moodboard-index-grid">${cards}</section>`
}`;
}

function moodboardIndexCard(board, projects, esc, escA, icon) {
  const project = (projects || []).find((p) => p.id === board.projectId);
  const count = moodboardItemCount(board);
  const updated = new Date(board.updatedAt || Date.now()).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  return `<article class="moodboard-index-card" data-moodboard-id="${escA(board.id)}">
  <button type="button" class="moodboard-card-open" data-open-moodboard="${escA(board.id)}">
    ${moodboardCover(board, esc)}
    <span>
      <strong>${esc(board.name)}</strong>
      <small>${count} refs · Private · ${esc(updated)}${project ? " · " + esc(project.name) : ""}</small>
    </span>
  </button>
  <div class="moodboard-card-actions">
    <button type="button" data-open-moodboard="${escA(board.id)}">Open</button>
    <button type="button" data-rename-moodboard="${escA(board.id)}">Rename</button>
    <button type="button" data-link-moodboard-project="${escA(board.id)}">Add to Project</button>
    <button type="button" class="danger-link" data-delete-moodboard="${escA(board.id)}">Delete</button>
  </div>
</article>`;
}

function moodboardCover(board, esc) {
  const items = (board.objects || []).filter((o) => o.kind === "item").slice(0, 4);
  if (!items.length) return `<div class="moodboard-cover empty-cover"><span>Empty board</span></div>`;
  return `<div class="moodboard-cover">${items.map(() => `<i></i>`).join("")}</div>`;
}

export function createMoodboardDialogMarkup(ctx) {
  const { esc, escA, icon, selectedCount, fromSelection } = ctx;
  const renameName = ctx.renameName || "";
  const isRename = !!ctx.renameId;
  const count = selectedCount || 0;
  return `<div class="app-dialog-backdrop"><section class="app-dialog create-moodboard-dialog" role="dialog" aria-modal="true" aria-labelledby="create-moodboard-title">
  <form data-create-moodboard-form>
    <div class="app-dialog-head">
      <div>
        <span class="section-label">Moodboard</span>
        <h2 id="create-moodboard-title">${isRename ? "Rename Moodboard" : "Create Moodboard"}</h2>
      </div>
      <button class="icon-button" type="button" data-dialog-cancel>${icon("close")}</button>
    </div>
    <label class="app-dialog-field"><span>Board name</span>
      <input name="name" required maxlength="120" placeholder="Tea Shop — Warm Minimal Direction" autocomplete="off" value="${escA(renameName)}">
    </label>
    <div class="create-moodboard-meta">
      <p><strong>Create from:</strong> ${fromSelection ? esc(count + " selected references") : "Blank board"}</p>
      <p><strong>Visibility:</strong> Private</p>
      <p class="settings-field-hint">Max ${MOODBOARD_SOFT_LIMIT} references per board. Objects stay in Vault Library—board only stores layout relations.</p>
    </div>
    <input type="hidden" name="preset" value="${DEFAULT_GRID_PRESET}">
    <div class="app-dialog-actions">
      <button class="ghost-button" type="button" data-dialog-cancel>Cancel</button>
      <button class="primary-button" type="submit">${isRename ? "Save name" : "Create Moodboard"}</button>
    </div>
  </form>
</section></div>`;
}

export function moodboardVaultPickerMarkup(ctx) {
  const {
    items,
    board,
    cols,
    collectionId = "all",
    typeFilter = "all",
    query = "",
    selectedIds = [],
    esc,
    escA,
    icon,
    media,
    host
  } = ctx;
  const onBoard = new Set((board?.objects || []).filter((o) => o.kind === "item" && o.itemId).map((o) => o.itemId));
  const picked = new Set((selectedIds || []).map(String));
  const activeCol = collectionId || "all";
  const activeType = typeFilter || "all";
  const q = String(query || "").trim().toLowerCase();
  const colOptions = [`<option value="all"${activeCol === "all" ? " selected" : ""}>All Vault Library</option>`]
    .concat(
      (cols || [])
        .filter((c) => c && !c.system)
        .map((c) => `<option value="${escA(c.id)}"${activeCol === c.id ? " selected" : ""}>${esc(c.name)}</option>`)
    )
    .join("");
  const typeChips = ["all", "image", "video", "link", "note"]
    .map((t) => {
      const label = t === "all" ? "All" : t === "image" ? "Images" : t === "video" ? "Videos" : t === "link" ? "Links" : "Notes";
      return `<button type="button" class="moodboard-picker-type ${activeType === t ? "active" : ""}" data-picker-type="${t}">${label}</button>`;
    })
    .join("");
  const filtered = (items || []).filter((item) => {
    if (activeType !== "all" && item.type !== activeType) return false;
    if (!q) return true;
    const hay = [item.title, item.note, item.sourceUrl, item.type, host(item.sourceUrl)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
  const available = filtered.filter((item) => !onBoard.has(item.id));
  const cards = filtered.slice(0, 160).map((item) => {
    const used = onBoard.has(item.id);
    const checked = picked.has(item.id);
    const tip = used ? `${item.title} · On board` : item.title;
    return `<label class="moodboard-picker-card ${used ? "on-board" : ""} ${checked ? "is-checked" : ""}" title="${escA(tip)}">
        <input type="checkbox" data-picker-check="${escA(item.id)}" ${checked ? "checked" : ""} ${used ? "disabled" : ""} aria-label="Select ${escA(item.title)}">
        <span class="moodboard-picker-media">${media(item)}</span>
        <span class="moodboard-picker-meta"><strong>${esc(item.title)}</strong></span>
      </label>`;
  }).join("");
  const emptyHint = q || activeType !== "all" || activeCol !== "all"
    ? "No objects match this search/filter."
    : "No Vault objects yet.";
  const pickCount = [...picked].filter((id) => !onBoard.has(id)).length;
  return `<div class="app-dialog-backdrop"><section class="app-dialog moodboard-vault-picker" role="dialog" aria-modal="true" aria-labelledby="moodboard-picker-title">
    <div class="app-dialog-head">
      <div>
        <span class="section-label">Vault Library</span>
        <h2 id="moodboard-picker-title">Add to board</h2>
      </div>
      <button class="icon-button" type="button" data-dialog-cancel>${icon("close")}</button>
    </div>
    <p class="app-dialog-message">เลือกได้หลายอันด้วย checkbox แล้วกด Add to board — วางบน canvas ลากอิสระได้</p>
    <div class="moodboard-picker-toolbar">
      <label class="moodboard-picker-search">
        <span class="visually-hidden">Search</span>
        <input type="search" data-picker-search value="${escA(query || "")}" placeholder="Search title, keyword, source…" autocomplete="off">
      </label>
      <label class="moodboard-picker-filter">
        <span>Collection</span>
        <select data-picker-collection aria-label="Filter by collection">${colOptions}</select>
      </label>
    </div>
    <div class="moodboard-picker-types" role="group" aria-label="Filter by type">${typeChips}</div>
    <div class="moodboard-picker-bulk">
      <button type="button" class="ghost-button" data-picker-select-visible ${available.length ? "" : "disabled"}>Select visible</button>
      <button type="button" class="ghost-button" data-picker-clear-selection ${pickCount ? "" : "disabled"}>Clear</button>
    </div>
    <div class="moodboard-picker-grid">${cards || `<p class="settings-field-hint">${emptyHint}</p>`}</div>
    <div class="app-dialog-actions">
      <span class="moodboard-picker-count">${filtered.length} shown · ${pickCount} selected</span>
      <button class="ghost-button" type="button" data-dialog-cancel>Cancel</button>
      <button class="primary-button" type="button" data-add-picked-vault ${pickCount ? "" : "disabled"}>Add ${pickCount || ""} to board</button>
    </div>
  </section></div>`;
}

export function linkProjectDialogMarkup(ctx) {
  const { boardId, projects, esc, escA, icon } = ctx;
  const options = (projects || [])
    .map((p) => `<option value="${escA(p.id)}">${esc(p.name)}</option>`)
    .join("");
  return `<div class="app-dialog-backdrop"><section class="app-dialog" role="dialog" aria-modal="true">
  <form data-link-moodboard-form>
    <div class="app-dialog-head"><div><span class="section-label">Project</span><h2>Add Moodboard to Project</h2></div>
    <button class="icon-button" type="button" data-dialog-cancel>${icon("close")}</button></div>
    <input type="hidden" name="boardId" value="${escA(boardId)}">
    <label class="app-dialog-field"><span>Project</span><select name="projectId" required><option value="">— Select —</option>${options}</select></label>
    <div class="app-dialog-actions"><button class="ghost-button" type="button" data-dialog-cancel>Cancel</button>
    <button class="primary-button" type="submit">Add to Project</button></div>
  </form></section></div>`;
}
