import type { Tier } from "@/hooks/useSubscription";
import { canCustomizeDocumentColors, showPoweredBy, showSo1oBadge } from "./access";
import {
  SOLO_DEFAULT_BRIEF,
  SOLO_DEFAULT_INVOICE,
  SOLO_DEFAULT_PRIMARY,
  SOLO_DEFAULT_RECEIPT,
} from "./defaults";
import { deriveBorder, deriveSoft, headerTextOn } from "./derivePalette";
import type { DocumentThemeInput, ResolvedDocumentColors, ResolvedDocumentTheme } from "./types";
import { normalizeHex } from "@/lib/colorUtils";

function pickColor(input: string | undefined, fallback: string): string {
  return normalizeHex(input) ?? fallback;
}

export function resolveDocumentColors(input?: DocumentThemeInput | null): ResolvedDocumentColors {
  const unified = input?.unifiedColors !== false;
  const primary = pickColor(input?.primary, SOLO_DEFAULT_PRIMARY);
  const invoiceAccent = unified ? primary : pickColor(input?.invoiceColor, SOLO_DEFAULT_INVOICE);
  const receiptAccent = unified ? primary : pickColor(input?.receiptColor, SOLO_DEFAULT_RECEIPT);
  const briefAccent = unified ? primary : pickColor(input?.briefAccent, SOLO_DEFAULT_BRIEF);

  const portalPrimary =
    input?.portalUseDocumentColors === false ? pickColor(input?.portalPrimary, primary) : primary;

  return {
    primary,
    invoiceAccent,
    receiptAccent,
    briefAccent,
    primarySoft: deriveSoft(primary),
    primaryBorder: deriveBorder(primary),
    headerTextOnPrimary: headerTextOn(primary),
    portalPrimary,
  };
}

export function resolveDocumentTheme(
  tier: Tier,
  input?: DocumentThemeInput | null,
): ResolvedDocumentTheme {
  const canCustomize = canCustomizeDocumentColors(tier);
  const colors = canCustomize ? resolveDocumentColors(input) : resolveDocumentColors(null);

  const tierBadge = showSo1oBadge(tier);
  const tierPowered = showPoweredBy(tier);

  return {
    colors,
    showSo1oBadge:
      canCustomize && input?.showSo1oBadge !== undefined ? input.showSo1oBadge : tierBadge,
    showPoweredBy:
      canCustomize && input?.showPoweredBy !== undefined ? input.showPoweredBy : tierPowered,
    canCustomize,
  };
}

export function docAccentForKind(
  colors: ResolvedDocumentColors,
  kind: "quotation" | "invoice" | "receipt" | "brief",
): string {
  if (kind === "invoice") return colors.invoiceAccent;
  if (kind === "receipt") return colors.receiptAccent;
  if (kind === "brief") return colors.briefAccent;
  return colors.primary;
}
