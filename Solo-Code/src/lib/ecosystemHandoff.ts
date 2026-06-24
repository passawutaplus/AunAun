/** Session keys for cross-app quotation handoff (Anthem → So1o). */

export const ANTHEM_QUOTATION_HANDOFF_KEY = "so1o.openQuotationFromAnthem";
export const STUDIO_QUOTATION_HANDOFF_KEY = "so1o.openQuotationFromStudio";

export type AnthemQuotationHandoff = {
  projectName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  endDate?: string;
  ecosystemLinkId?: string;
  conversationId?: string;
  requestId?: string;
};

export type StudioQuotationHandoff = {
  projectName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  endDate?: string;
  studioId: string;
  studioName: string;
  studioLogoUrl?: string;
  conversationId?: string;
  requestId?: string;
  members?: {
    userId?: string;
    displayName: string;
    revenuePercent?: number;
  }[];
};

export const ANTHEM_HANDOFF_EVENT = "so1o:anthem-handoff";
export const STUDIO_HANDOFF_EVENT = "so1o:studio-handoff";

export function storeAnthemQuotationHandoff(payload: AnthemQuotationHandoff): void {
  try {
    sessionStorage.setItem(ANTHEM_QUOTATION_HANDOFF_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(ANTHEM_HANDOFF_EVENT));
  } catch {
    /* noop */
  }
}

export function consumeAnthemQuotationHandoff(): AnthemQuotationHandoff | null {
  try {
    const raw = sessionStorage.getItem(ANTHEM_QUOTATION_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(ANTHEM_QUOTATION_HANDOFF_KEY);
    return JSON.parse(raw) as AnthemQuotationHandoff;
  } catch {
    return null;
  }
}

export function storeStudioQuotationHandoff(payload: StudioQuotationHandoff): void {
  try {
    sessionStorage.setItem(STUDIO_QUOTATION_HANDOFF_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(STUDIO_HANDOFF_EVENT));
  } catch {
    /* noop */
  }
}

export function consumeStudioQuotationHandoff(): StudioQuotationHandoff | null {
  try {
    const raw = sessionStorage.getItem(STUDIO_QUOTATION_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STUDIO_QUOTATION_HANDOFF_KEY);
    return JSON.parse(raw) as StudioQuotationHandoff;
  } catch {
    return null;
  }
}

/** URL-safe base64 JSON for studio members[] in deep links. */
export function encodeStudioMembersParam(
  members: NonNullable<StudioQuotationHandoff["members"]>,
): string {
  const json = JSON.stringify(members);
  if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return encodeURIComponent(json);
}

export function decodeStudioMembersParam(
  raw: string | null | undefined,
): StudioQuotationHandoff["members"] | undefined {
  if (!raw) return undefined;
  try {
    let json: string;
    try {
      json = decodeURIComponent(escape(atob(raw)));
    } catch {
      json = decodeURIComponent(raw);
    }
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    return parsed.map((m) => {
      const row = m as Record<string, unknown>;
      return {
        userId: typeof row.userId === "string" ? row.userId : undefined,
        displayName: String(row.displayName ?? "สมาชิก"),
        revenuePercent: typeof row.revenuePercent === "number" ? row.revenuePercent : undefined,
      };
    });
  } catch {
    return undefined;
  }
}

export type ParsedStudioDashboardParams =
  | { fromStudio: false }
  | {
      fromStudio: true;
      studioId?: string;
      studioName?: string;
      studioLogoUrl?: string;
      conversationId?: string;
      requestId?: string;
      clientName?: string;
      projectTitle?: string;
      clientEmail?: string;
      clientPhone?: string;
      message?: string;
      deadline?: string;
      linkId?: string;
      members?: StudioQuotationHandoff["members"];
    };

/** Parse Anthem → So1o studio combined quote deep-link params. */
export function parseStudioDashboardParams(search: string): ParsedStudioDashboardParams {
  const sp = new URLSearchParams(search);
  if (sp.get("from") !== "anthem" || sp.get("handoff") !== "studio") {
    return { fromStudio: false };
  }
  return {
    fromStudio: true,
    studioId: sp.get("studio_id") ?? undefined,
    studioName: sp.get("studio_name") ?? undefined,
    studioLogoUrl: sp.get("studio_logo") ?? undefined,
    conversationId: sp.get("conversation_id") ?? undefined,
    requestId: sp.get("request_id") ?? undefined,
    clientName: sp.get("client_name") ?? undefined,
    projectTitle: sp.get("project_title") ?? undefined,
    clientEmail: sp.get("client_email") ?? undefined,
    clientPhone: sp.get("client_phone") ?? undefined,
    message: sp.get("message") ?? undefined,
    deadline: sp.get("deadline") ?? undefined,
    linkId: sp.get("link_id") ?? undefined,
    members: decodeStudioMembersParam(sp.get("members_b64") ?? sp.get("members")),
  };
}

export function buildStudioQuotationHandoffFromParams(
  params: Extract<ParsedStudioDashboardParams, { fromStudio: true }>,
): StudioQuotationHandoff | null {
  if (!params.studioId?.trim() || !params.studioName?.trim()) return null;

  const notesParts: string[] = [];
  if (params.message) notesParts.push(params.message);
  if (params.deadline) notesParts.push(`กำหนดส่ง: ${params.deadline}`);
  if (params.conversationId) notesParts.push(`แชท Studio: ${params.conversationId}`);
  if (params.requestId) notesParts.push(`studio_request:${params.requestId}`);

  return {
    projectName: params.projectTitle?.trim() || "โปรเจกต์ Studio",
    clientName: params.clientName?.trim() || "ลูกค้า",
    clientEmail: params.clientEmail,
    clientPhone: params.clientPhone,
    endDate: params.deadline,
    studioId: params.studioId.trim(),
    studioName: params.studioName.trim(),
    studioLogoUrl: params.studioLogoUrl,
    conversationId: params.conversationId,
    requestId: params.requestId,
    notes: notesParts.length ? notesParts.join("\n\n") : undefined,
    members: params.members,
  };
}

export const STUDIO_DASHBOARD_PARAM_KEYS = [
  "handoff",
  "studio_id",
  "studio_name",
  "studio_logo",
  "members",
  "members_b64",
  "conversation_id",
  "request_id",
  "client_name",
  "project_title",
  "client_email",
  "client_phone",
  "message",
  "deadline",
  "link_id",
] as const;

/** Parse Anthem deep-link query params from dashboard URL. */
export function parseAnthemDashboardParams(search: string): {
  fromAnthem: boolean;
  conversationId?: string;
  requestId?: string;
  clientName?: string;
  projectTitle?: string;
  clientEmail?: string;
  clientPhone?: string;
  message?: string;
  deadline?: string;
  linkId?: string;
} {
  const sp = new URLSearchParams(search);
  if (sp.get("from") !== "anthem" || sp.get("handoff") === "studio") {
    return { fromAnthem: false };
  }
  return {
    fromAnthem: true,
    conversationId: sp.get("conversation_id") ?? undefined,
    requestId: sp.get("request_id") ?? undefined,
    clientName: sp.get("client_name") ?? undefined,
    projectTitle: sp.get("project_title") ?? undefined,
    clientEmail: sp.get("client_email") ?? undefined,
    clientPhone: sp.get("client_phone") ?? undefined,
    message: sp.get("message") ?? undefined,
    deadline: sp.get("deadline") ?? undefined,
    linkId: sp.get("link_id") ?? undefined,
  };
}
