/** Session handoff: Creative Labs → Smart Brief */

export const CREATIVE_LAB_HANDOFF_KEY = "so1o.creativeLabHandoff";
export const CREATIVE_LAB_HANDOFF_EVENT = "so1o:creative-lab-handoff";
export const OPEN_BRIEF_ID_KEY = "so1o.openBriefId";

export type CreativeLabHandoffKind = "color" | "fonts" | "palette";

export type CreativeLabHandoff = {
  kind: CreativeLabHandoffKind;
  hexes?: string[];
  likedFonts?: string;
  paletteName?: string;
  briefId?: string;
};

export function storeCreativeLabHandoff(payload: CreativeLabHandoff): void {
  try {
    sessionStorage.setItem(CREATIVE_LAB_HANDOFF_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(CREATIVE_LAB_HANDOFF_EVENT));
  } catch {
    /* noop */
  }
}

export function consumeCreativeLabHandoff(): CreativeLabHandoff | null {
  try {
    const raw = sessionStorage.getItem(CREATIVE_LAB_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CREATIVE_LAB_HANDOFF_KEY);
    return JSON.parse(raw) as CreativeLabHandoff;
  } catch {
    return null;
  }
}

export function requestOpenBrief(briefId?: string): void {
  try {
    if (briefId) sessionStorage.setItem(OPEN_BRIEF_ID_KEY, briefId);
  } catch {
    /* noop */
  }
}

export function consumeOpenBriefId(): string | null {
  try {
    const id = sessionStorage.getItem(OPEN_BRIEF_ID_KEY);
    if (!id) return null;
    sessionStorage.removeItem(OPEN_BRIEF_ID_KEY);
    return id;
  } catch {
    return null;
  }
}
