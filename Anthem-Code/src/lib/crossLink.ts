/**
 * Cross-link helper for the Aplus1 ↔ So1o ecosystem.
 */
import { supabase } from "@/integrations/supabase/client";
import { SO1O_APP_URL } from "@/lib/productLinks";

export { SO1O_APP_URL };

export type CrossLinkContext = {
  /** Where the CTA lives, e.g. "project_detail" | "chat_header". */
  source: string;
  /** Aplus1 entity id this link references. */
  refId?: string;
  /** Optional extra payload (kept small). */
  meta?: Record<string, string | number | undefined>;
};

/**
 * Build a So1o URL with cross-link query params.
 */
export function so1oUrl(
  path: string,
  params: Record<string, string | undefined> = {},
): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, SO1O_APP_URL);
  url.searchParams.set("from", "anthem");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}

/** Deep-link to So1o quotation form with Aplus1 hire context. */
export function so1oQuotationUrl(params: {
  conversationId?: string;
  requestId?: string;
  clientName?: string;
  projectTitle?: string;
  clientEmail?: string;
  clientPhone?: string;
  message?: string;
  deadline?: string;
  linkId?: string;
}): string {
  return so1oUrl("/dashboard", {
    tab: "finance",
    sub: "quotations",
    conversation_id: params.conversationId,
    request_id: params.requestId,
    client_name: params.clientName,
    project_title: params.projectTitle,
    client_email: params.clientEmail,
    client_phone: params.clientPhone,
    message: params.message,
    deadline: params.deadline,
    link_id: params.linkId,
  });
}

export type StudioQuoteMember = {
  userId?: string;
  displayName: string;
  revenuePercent?: number;
};

function encodeStudioMembersParam(members: StudioQuoteMember[]): string {
  const json = JSON.stringify(members);
  if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return encodeURIComponent(json);
}

/** Deep-link to So1o combined studio quotation (In-House tier required on So1o). */
export function so1oStudioQuotationUrl(params: {
  studioId: string;
  studioName: string;
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
  members?: StudioQuoteMember[];
}): string {
  const membersParam =
    params.members && params.members.length > 0
      ? encodeStudioMembersParam(params.members)
      : undefined;

  return so1oUrl("/dashboard", {
    tab: "finance",
    sub: "quotations",
    handoff: "studio",
    studio_id: params.studioId,
    studio_name: params.studioName,
    studio_logo: params.studioLogoUrl,
    conversation_id: params.conversationId,
    request_id: params.requestId,
    client_name: params.clientName,
    project_title: params.projectTitle,
    client_email: params.clientEmail,
    client_phone: params.clientPhone,
    message: params.message,
    deadline: params.deadline,
    link_id: params.linkId,
    members_b64: membersParam,
  });
}

/**
 * Log cross-app CTA to ecosystem_links. Never throws.
 */
export async function trackCrossLink(ctx: CrossLinkContext): Promise<string | undefined> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return undefined;

    const { data, error } = await supabase
      .from("ecosystem_links")
      .insert({
        user_id: userId,
        event_type: "cross_link_click",
        source_app: "anthem",
        source_page: ctx.source,
        ref_id: ctx.refId ?? null,
        meta: ctx.meta ?? {},
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[cross_link] insert failed", error.message);
      return undefined;
    }
    return data?.id as string | undefined;
  } catch {
    return undefined;
  }
}

/** Mark ecosystem_links row as converted (flywheel analytics). Never throws. */
export async function markEcosystemLinkConverted(
  linkId: string | undefined,
  target: string,
  extra?: Record<string, string | number | undefined>,
): Promise<void> {
  if (!linkId?.trim()) return;
  try {
    const { data: row } = await supabase
      .from("ecosystem_links")
      .select("meta")
      .eq("id", linkId)
      .maybeSingle();

    const prev = (row?.meta ?? {}) as Record<string, unknown>;
    await supabase
      .from("ecosystem_links")
      .update({
        meta: {
          ...prev,
          converted_at: new Date().toISOString(),
          target,
          ...extra,
        },
      })
      .eq("id", linkId);
  } catch {
    /* noop */
  }
}
