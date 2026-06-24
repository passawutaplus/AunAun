import type { Tier } from "@/hooks/useSubscription";
import type { IssuerSnapshot } from "@/lib/quotationKinds";
import type { DocumentThemeInput, PortalBranding } from "./types";
import { resolveDocumentTheme } from "./resolveTheme";

/** Portal branding from a frozen org/studio issuer snapshot (team quotes). */
export function portalBrandingFromIssuer(
  issuer: IssuerSnapshot,
  tier: Tier = "inhouse",
): PortalBranding {
  const themeInput = (issuer.documentTheme ?? {}) as DocumentThemeInput;
  const theme = resolveDocumentTheme(tier, themeInput);
  return {
    showPoweredBy: theme.showPoweredBy,
    showLogo: themeInput.portalShowLogo !== false,
    brandName: issuer.brandName?.trim() || "So1o Freelancer",
    tagline: issuer.tagline?.trim() || null,
    logoUrl: issuer.logoUrl?.trim() || null,
    welcomeMessage: themeInput.portalWelcomeMessage?.trim() || null,
    theme,
  };
}
