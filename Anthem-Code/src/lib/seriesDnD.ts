/** HTML5 DnD mime for dragging a project onto a series folder. */
export const SERIES_PROJECT_DND_TYPE = "application/x-aplus1-project-id";

const SERIES_PROJECT_DRAG_PREFIX = "series-project:";

/** Stable id for a project drag payload (dnd-kit or dataTransfer). */
export function seriesProjectDragId(projectId: string): string {
  return `${SERIES_PROJECT_DRAG_PREFIX}${projectId}`;
}

export function writeSeriesProjectDragId(dt: DataTransfer, projectId: string): void {
  dt.setData(SERIES_PROJECT_DND_TYPE, projectId);
  dt.setData("text/plain", projectId);
  dt.effectAllowed = "copy";
}

export function readSeriesProjectDragId(dt: DataTransfer): string | null {
  const typed = dt.getData(SERIES_PROJECT_DND_TYPE)?.trim();
  if (typed) return typed;
  const plain = dt.getData("text/plain")?.trim();
  if (!plain) return null;
  if (plain.startsWith(SERIES_PROJECT_DRAG_PREFIX)) {
    return plain.slice(SERIES_PROJECT_DRAG_PREFIX.length) || null;
  }
  return plain;
}
