/** HTML5 DnD for dragging an Inspire library image onto a board chip. */
export const INSPIRE_ITEM_DND_TYPE = "application/x-aplus1-inspire-item";

export type InspireDragPayload = {
  imageUrl: string;
  projectId: string;
};

export function writeInspireItemDrag(dt: DataTransfer, payload: InspireDragPayload): void {
  const json = JSON.stringify(payload);
  dt.setData(INSPIRE_ITEM_DND_TYPE, json);
  dt.setData("text/plain", json);
  dt.effectAllowed = "copy";
}

export function readInspireItemDrag(dt: DataTransfer): InspireDragPayload | null {
  const raw = dt.getData(INSPIRE_ITEM_DND_TYPE)?.trim() || dt.getData("text/plain")?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<InspireDragPayload>;
    const imageUrl = typeof parsed.imageUrl === "string" ? parsed.imageUrl.trim() : "";
    const projectId = typeof parsed.projectId === "string" ? parsed.projectId.trim() : "";
    if (!imageUrl || !projectId) return null;
    return { imageUrl, projectId };
  } catch {
    return null;
  }
}
