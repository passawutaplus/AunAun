/** Session handoff: Creative Labs palette → Smart Brief */

export const LABS_PALETTE_HANDOFF_KEY = "so1o.labsPaletteHandoff";
export const LABS_PALETTE_HANDOFF_EVENT = "so1o:labs-palette-handoff";

export type LabsPaletteHandoff = {
  paletteName: string;
  hexes: string[];
};

export function storeLabsPaletteHandoff(payload: LabsPaletteHandoff): void {
  try {
    sessionStorage.setItem(LABS_PALETTE_HANDOFF_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(LABS_PALETTE_HANDOFF_EVENT));
  } catch {
    /* noop */
  }
}

export function consumeLabsPaletteHandoff(): LabsPaletteHandoff | null {
  try {
    const raw = sessionStorage.getItem(LABS_PALETTE_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(LABS_PALETTE_HANDOFF_KEY);
    const parsed = JSON.parse(raw) as LabsPaletteHandoff;
    if (!Array.isArray(parsed.hexes) || parsed.hexes.length === 0) return null;
    return {
      paletteName: typeof parsed.paletteName === "string" ? parsed.paletteName : "พาเลทจาก Labs",
      hexes: parsed.hexes.filter((h): h is string => typeof h === "string"),
    };
  } catch {
    return null;
  }
}
