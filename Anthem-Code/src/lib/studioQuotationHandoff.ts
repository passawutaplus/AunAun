import type { Tier } from "@/core/subscription/useSubscription";
import type { Studio, StudioMember } from "@/hooks/useStudios";
import { isSoloEcosystemEnabled } from "@/lib/aplus1Launch";
import { so1oStudioQuotationUrl, trackCrossLink } from "@/lib/crossLink";
import { notifySoloComingSoon, openSoloExternal } from "@/lib/soloEcosystemGate";

const QUOTE_ROLES = new Set<StudioMember["role"]>(["owner", "admin"]);

export function canOpenStudioCombinedQuote(
  tier: Tier,
  role?: StudioMember["role"],
): boolean {
  return tier === "inhouse" && !!role && QUOTE_ROLES.has(role);
}

export function canShowStudioQuoteUpsell(
  tier: Tier,
  role?: StudioMember["role"],
): boolean {
  return !!role && QUOTE_ROLES.has(role) && tier !== "inhouse";
}

export type OpenStudioQuotationParams = {
  tier: Tier;
  studio: Studio;
  members: StudioMember[];
  source: string;
  conversationId?: string;
  requestId?: string;
  projectTitle?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  message?: string;
  deadline?: string;
  onRequireInHouse: () => void;
};

export async function openStudioQuotation(params: OpenStudioQuotationParams): Promise<void> {
  if (!isSoloEcosystemEnabled()) {
    notifySoloComingSoon();
    return;
  }

  if (params.tier !== "inhouse") {
    params.onRequireInHouse();
    return;
  }

  const linkId = await trackCrossLink({
    source: params.source,
    refId: params.studio.id,
    meta: { studio_slug: params.studio.slug },
  });

  const members = params.members.map((m) => ({
    userId: m.user_id,
    displayName: m.profile?.display_name ?? "สมาชิก",
  }));

  const url = so1oStudioQuotationUrl({
    studioId: params.studio.id,
    studioName: params.studio.name,
    studioLogoUrl: params.studio.avatar_url || undefined,
    conversationId: params.conversationId,
    requestId: params.requestId,
    clientName: params.clientName,
    projectTitle: params.projectTitle,
    clientEmail: params.clientEmail,
    clientPhone: params.clientPhone,
    message: params.message,
    deadline: params.deadline,
    linkId,
    members,
  });

  openSoloExternal(url);
}
