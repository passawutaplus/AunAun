import { id } from "./core.js";

export function explicitProjectCollectionIds(project) {
  return Array.isArray(project?.collectionIds) ? project.collectionIds.filter(Boolean) : [];
}

export function collectionDisplayLabel(collection, cols) {
  if (!collection) return "";
  if (collection.parentId) {
    const parent = cols.find((c) => c.id === collection.parentId);
    if (parent) return `${parent.name} / ${collection.name}`;
  }
  return collection.name;
}

export function boardRef(raw) {
  const parts = String(raw || "").split(":");
  return { projectId: parts[0], boardId: parts[1] };
}

export function allBoards(projects) {
  return (projects || []).flatMap((project) =>
    (project.boards || []).map((board) => ({ project, board }))
  );
}

export function uniqueBoardName(name, boards) {
  const existing = new Set((boards || []).map((b) => b.name));
  let next = String(name || "Moodboard").trim() || "Moodboard";
  if (!existing.has(next)) return next;
  let suffix = 2;
  while (existing.has(`${next} (${suffix})`)) suffix += 1;
  return `${next} (${suffix})`;
}

export function removeCollectionFromProject(project, colId) {
  if (!project || !colId) return false;
  project.collectionIds = explicitProjectCollectionIds(project).filter((id) => id !== colId);
  return true;
}

export function removeBoardFromProject(project, boardId) {
  if (!project || !boardId) return null;
  const board = (project.boards || []).find((b) => b.id === boardId);
  if (!board) return null;
  project.boards = (project.boards || []).filter((b) => b.id !== boardId);
  return board;
}

export function cloneBoardObject(object, normalizeBoardObject) {
  const copy = normalizeBoardObject(object);
  copy.id = id();
  return copy;
}

export function cloneBoardToProject(projects, sourceRef, targetProjectId, normalizeBoardObject) {
  const ref = boardRef(sourceRef);
  const sourceProject = projects.find((p) => p.id === ref.projectId);
  const sourceBoard = sourceProject?.boards?.find((b) => b.id === ref.boardId);
  const target = projects.find((p) => p.id === targetProjectId);
  if (!sourceBoard || !target) return null;
  const cloned = {
    id: id(),
    name: uniqueBoardName(sourceBoard.name, target.boards),
    objects: (sourceBoard.objects || []).map((o) => cloneBoardObject(o, normalizeBoardObject)),
  };
  target.boards = (target.boards || []).concat(cloned);
  return cloned;
}

export function updateProjectDetails(project, patch) {
  if (!project || !patch) return;
  if (patch.name !== undefined) project.name = String(patch.name).trim() || project.name;
  if (patch.description !== undefined) project.description = String(patch.description).trim();
}

export function availableCollectionsForProject(state, projectId) {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return [];
  const linked = new Set(explicitProjectCollectionIds(project));
  return state.cols.filter((c) => !c.system && !linked.has(c.id));
}

export function availableBoardsForProject(state, projectId) {
  return allBoards(state.projects).filter((pair) => pair.project.id !== projectId);
}

export function projectCollectionPickerDialog(dialog, helpers) {
  const { esc, escA, icon, state, itemsForCollection } = helpers;
  const project = state.projects.find((p) => p.id === dialog.projectId);
  const available = Array.isArray(dialog.available) ? dialog.available : availableCollectionsForProject(state, dialog.projectId);
  const options = available
    .map(
      (c) =>
        `<option value="${escA(c.id)}">${esc(collectionDisplayLabel(c, state.cols))} (${itemsForCollection(c.id).length} objects)</option>`
    )
    .join("");
  return `<div class='app-dialog-backdrop'><section class='app-dialog project-picker-dialog' role='dialog' aria-modal='true'><form data-project-collection-form><div class='app-dialog-head'><div><span class='section-label'>Project</span><h2>Add collection to project</h2></div><button class='icon-button' type='button' data-dialog-cancel>${icon("close")}</button></div><p class='app-dialog-message'>Choose an existing collection or create a new one for ${esc(project?.name || "this project")}.</p><label class='app-dialog-field'><span>Existing collection</span><select name='existingId'><option value=''>— Select collection —</option>${options}</select></label><label class='app-dialog-field'><span>Or create new</span><input name='newName' placeholder='Collection name' autocomplete='off'></label><div class='app-dialog-actions'><button class='ghost-button' type='button' data-dialog-cancel>Cancel</button><button class='primary-button' type='submit'>Add to project</button></div></form></section></div>`;
}

export function projectMoodboardPickerDialog(dialog, helpers) {
  const { esc, escA, icon, state } = helpers;
  const project = state.projects.find((p) => p.id === dialog.projectId);
  const available = Array.isArray(dialog.available) ? dialog.available : availableBoardsForProject(state, dialog.projectId);
  const options = available
    .map(
      (pair) =>
        `<option value="${escA(pair.project.id)}:${escA(pair.board.id)}">${esc(pair.board.name)} · ${esc(pair.project.name)} (${(pair.board.objects || []).length} objects)</option>`
    )
    .join("");
  return `<div class='app-dialog-backdrop'><section class='app-dialog project-picker-dialog' role='dialog' aria-modal='true'><form data-project-moodboard-form><div class='app-dialog-head'><div><span class='section-label'>Project</span><h2>Add moodboard to project</h2></div><button class='icon-button' type='button' data-dialog-cancel>${icon("close")}</button></div><p class='app-dialog-message'>Copy an existing moodboard into ${esc(project?.name || "this project")} or create a new one.</p><label class='app-dialog-field'><span>Existing moodboard</span><select name='existingRef'><option value=''>— Select moodboard —</option>${options}</select></label><label class='app-dialog-field'><span>Or create new</span><input name='newName' placeholder='Moodboard name' autocomplete='off'></label><div class='app-dialog-actions'><button class='ghost-button' type='button' data-dialog-cancel>Cancel</button><button class='primary-button' type='submit'>Add to project</button></div></form></section></div>`;
}

export function projectSettingsDialog(dialog, helpers) {
  const { esc, escA, icon, state } = helpers;
  const project = state.projects.find((p) => p.id === dialog.projectId);
  if (!project) return "";
  return `<div class='app-dialog-backdrop'><section class='app-dialog project-settings-dialog' role='dialog' aria-modal='true'><form data-project-settings-form><div class='app-dialog-head'><div><span class='section-label'>Project</span><h2>Project settings</h2></div><button class='icon-button' type='button' data-dialog-cancel>${icon("close")}</button></div><p class='app-dialog-message'>Edit the project name and notes for this workspace.</p><label class='app-dialog-field'><span>Project name</span><input name='name' value='${escA(project.name)}' required autofocus></label><label class='app-dialog-field'><span>Description</span><textarea name='description' rows='4' placeholder='Client, scope, notes for this job…'>${esc(project.description || "")}</textarea></label><div class='app-dialog-actions'><button class='ghost-button' type='button' data-dialog-cancel>Cancel</button><button class='primary-button' type='submit'>Save project details</button></div><input type='hidden' name='projectId' value='${escA(project.id)}'></form></section></div>`;
}

export function projectMetaIconsMarkup(boardCount, collectionCount, icon) {
  return `<span class='project-meta-icons'><span class='project-meta-icon' title='Moodboards'>${icon("board")}<em>${boardCount}</em></span><span class='project-meta-icon' title='Collections'>${icon("collection")}<em>${collectionCount}</em></span></span>`;
}

export function projectLinkedCollectionsMarkup(project, state, esc) {
  const cols = explicitProjectCollectionIds(project)
    .map((colId) => state.cols.find((c) => c.id === colId))
    .filter(Boolean);
  if (!cols.length) return "";
  return `<ul class='project-linked-cols'>${cols.map((c) => `<li title='${esc(c.name)}'>${esc(c.name)}</li>`).join("")}</ul>`;
}
