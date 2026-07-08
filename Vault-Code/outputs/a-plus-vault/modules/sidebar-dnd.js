export function bindCollectionDrag(ctx) {
  const {
    state,
    getSuppressColClick,
    setSuppressColClick,
    handleCollectionDrop,
    addCollectionToProject,
    openConfirmDialog,
    explicitProjectCollectionIds,
  } = ctx;
  const list = document.querySelector(".collection-list");
  if (!list) return;

  const clearMarks = () => {
    list.classList.remove("is-col-dragging");
    document
      .querySelectorAll("[data-dragcol],[data-dropcol-root],[data-dropproject]")
      .forEach((el) => el.classList.remove("drop-before", "drop-after", "drop-nest", "drop-target"));
    const rootDrop = document.querySelector("[data-dropcol-root]");
    if (rootDrop) rootDrop.hidden = true;
  };

  document.querySelectorAll("[data-dragcol]").forEach((row) => {
    row.addEventListener("dragstart", (e) => {
      if (e.target.closest(".row-menu,.row-menu-trigger,[data-rowmenu]")) {
        e.preventDefault();
        return;
      }
      state.openMenu = null;
      row.classList.add("dragging");
      list.classList.add("is-col-dragging");
      const rootDrop = document.querySelector("[data-dropcol-root]");
      if (rootDrop) rootDrop.hidden = false;
      e.dataTransfer.setData("vault-col", row.dataset.dragcol);
      e.dataTransfer.effectAllowed = "move";
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      clearMarks();
    });
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = row.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const h = rect.height;
      row.classList.remove("drop-before", "drop-after", "drop-nest");
      if (y < h * 0.28) row.classList.add("drop-before");
      else if (y > h * 0.72) row.classList.add("drop-after");
      else row.classList.add("drop-nest");
    });
    row.addEventListener("dragleave", (e) => {
      if (!row.contains(e.relatedTarget)) row.classList.remove("drop-before", "drop-after", "drop-nest");
    });
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const fromId = e.dataTransfer.getData("vault-col");
      const mode = row.classList.contains("drop-nest")
        ? "nest"
        : row.classList.contains("drop-before")
          ? "before"
          : "after";
      clearMarks();
      if (!fromId || fromId === row.dataset.dragcol) return;
      setSuppressColClick(true);
      handleCollectionDrop(fromId, row.dataset.dragcol, mode);
      setTimeout(() => setSuppressColClick(false), 0);
    });
  });

  const rootDrop = document.querySelector("[data-dropcol-root]");
  if (rootDrop) {
    rootDrop.addEventListener("dragover", (e) => {
      e.preventDefault();
      rootDrop.classList.add("drop-target");
    });
    rootDrop.addEventListener("dragleave", (e) => {
      if (!rootDrop.contains(e.relatedTarget)) rootDrop.classList.remove("drop-target");
    });
    rootDrop.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const fromId = e.dataTransfer.getData("vault-col");
      clearMarks();
      if (!fromId) return;
      setSuppressColClick(true);
      handleCollectionDrop(fromId, null, "promote");
      setTimeout(() => setSuppressColClick(false), 0);
    });
  }

  document.querySelectorAll("[data-dropproject]").forEach((wrap) => {
    wrap.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      wrap.classList.add("drop-target");
    });
    wrap.addEventListener("dragleave", (e) => {
      if (!wrap.contains(e.relatedTarget)) wrap.classList.remove("drop-target");
    });
    wrap.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const fromId = e.dataTransfer.getData("vault-col");
      const projectId = wrap.dataset.dropproject;
      wrap.classList.remove("drop-target");
      if (!fromId || !projectId) return;
      const col = state.cols.find((c) => c.id === fromId);
      const project = state.projects.find((p) => p.id === projectId);
      if (!col || col.system || !project) return;
      if (explicitProjectCollectionIds(project).includes(fromId)) return;
      setSuppressColClick(true);
      openConfirmDialog({
        title: "Add collection to project",
        message: `Add "${col.name}" to project "${project.name}"?`,
        confirmText: "Add to project",
        onConfirm: () => addCollectionToProject(projectId, fromId),
      });
      setTimeout(() => setSuppressColClick(false), 0);
    });
  });
}
