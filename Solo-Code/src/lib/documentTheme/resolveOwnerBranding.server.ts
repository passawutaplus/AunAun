import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tier } from "@/hooks/useSubscription";
import type { IssuerSnapshot } from "@/lib/quotationKinds";
import type { DocumentThemeInput, PortalBranding } from "./types";
import { portalBrandingFromIssuer } from "./portalFromIssuer";
import { resolveDocumentTheme } from "./resolveTheme";

type ProfileBrandingRow = {
  brand_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  subscription_tier: string | null;
  document_theme: DocumentThemeInput | null;
};

function toTier(raw: string | null | undefined): Tier {
  if (raw === "pro" || raw === "pro_plus" || raw === "inhouse") return raw;
  return "free";
}

export async function resolveOwnerPortalBranding(userId: string): Promise<PortalBranding> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("brand_name, tagline, logo_url, subscription_tier, document_theme")
    .eq("user_id", userId)
    .maybeSingle();

  const row = (profile ?? {}) as ProfileBrandingRow;
  const tier = toTier(row.subscription_tier);
  const themeInput = (row.document_theme ?? {}) as DocumentThemeInput;
  const theme = resolveDocumentTheme(tier, themeInput);

  return {
    showPoweredBy: theme.showPoweredBy,
    showLogo: themeInput.portalShowLogo !== false,
    brandName: row.brand_name?.trim() || "So1o Freelancer",
    tagline: row.tagline?.trim() || null,
    logoUrl: row.logo_url?.trim() || null,
    welcomeMessage: themeInput.portalWelcomeMessage?.trim() || null,
    theme,
  };
}

type QuotationBrandingRow = {
  quotation_kind: string | null;
  org_snapshot: IssuerSnapshot | null;
  studio_snapshot: IssuerSnapshot | null;
};

/** Portal branding for a job's linked quotation (org/studio issuer) or owner profile fallback. */
export async function resolveQuotationPortalBranding(
  quotationId: string | null | undefined,
  ownerUserId: string,
): Promise<PortalBranding> {
  if (quotationId) {
    const { data: q } = await supabaseAdmin
      .from("quotations")
      .select("quotation_kind, org_snapshot, studio_snapshot")
      .eq("id", quotationId)
      .maybeSingle();

    const row = q as QuotationBrandingRow | null;
    if (row?.quotation_kind === "inhouse" && row.org_snapshot) {
      return portalBrandingFromIssuer(row.org_snapshot, "inhouse");
    }
    if (row?.quotation_kind === "studio" && row.studio_snapshot) {
      return portalBrandingFromIssuer(row.studio_snapshot, "inhouse");
    }
  }
  return resolveOwnerPortalBranding(ownerUserId);
}
