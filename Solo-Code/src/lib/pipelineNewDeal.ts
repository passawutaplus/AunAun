/** Session handoff keys between sidebar CTA and tab mounts */

export const PIPELINE_NEW_DEAL_KEY = "so1o.pipelineNewDeal";
export const OPEN_BRIEF_MODE_KEY = "so1o.openBriefMode";
export const OPEN_MEETING_CAPTURE_KEY = "so1o.openMeetingCapture";

export type PipelineNewDealAction = "quotation";
export type OpenBriefMode = "quick";

export function queuePipelineQuotation() {
  try {
    sessionStorage.setItem(PIPELINE_NEW_DEAL_KEY, "quotation");
  } catch {
    /* noop */
  }
}

export function consumePipelineNewDeal(): PipelineNewDealAction | null {
  try {
    const v = sessionStorage.getItem(PIPELINE_NEW_DEAL_KEY);
    sessionStorage.removeItem(PIPELINE_NEW_DEAL_KEY);
    return v === "quotation" ? "quotation" : null;
  } catch {
    return null;
  }
}

export function queueSmartBriefQuickCapture() {
  try {
    sessionStorage.setItem(OPEN_BRIEF_MODE_KEY, "quick");
  } catch {
    /* noop */
  }
}

export function queueMeetingCapture() {
  try {
    sessionStorage.setItem(OPEN_MEETING_CAPTURE_KEY, "1");
  } catch {
    /* noop */
  }
}

export function consumeOpenBriefMode(): OpenBriefMode | null {
  try {
    const v = sessionStorage.getItem(OPEN_BRIEF_MODE_KEY);
    sessionStorage.removeItem(OPEN_BRIEF_MODE_KEY);
    return v === "quick" ? "quick" : null;
  } catch {
    return null;
  }
}

export function consumeOpenMeetingCapture(): boolean {
  try {
    const v = sessionStorage.getItem(OPEN_MEETING_CAPTURE_KEY);
    sessionStorage.removeItem(OPEN_MEETING_CAPTURE_KEY);
    return v === "1";
  } catch {
    return false;
  }
}
