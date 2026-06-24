export interface DocumentThemeInput {
  primary?: string;
  invoiceColor?: string;
  receiptColor?: string;
  briefAccent?: string;
  unifiedColors?: boolean;
  /** Pro+ override — when omitted, tier default (Free: show, Pro: hide). */
  showSo1oBadge?: boolean;
  /** Pro+ override for portal footer — when omitted, tier default. */
  showPoweredBy?: boolean;
  portalUseDocumentColors?: boolean;
  portalPrimary?: string;
  portalShowLogo?: boolean;
  portalWelcomeMessage?: string;
}

export interface ResolvedDocumentColors {
  primary: string;
  invoiceAccent: string;
  receiptAccent: string;
  briefAccent: string;
  primarySoft: string;
  primaryBorder: string;
  headerTextOnPrimary: string;
  portalPrimary: string;
}

export interface ResolvedDocumentTheme {
  colors: ResolvedDocumentColors;
  showSo1oBadge: boolean;
  showPoweredBy: boolean;
  canCustomize: boolean;
}

export interface PortalBranding {
  showPoweredBy: boolean;
  /** When false, hide logo on client portal even if logoUrl is set. */
  showLogo: boolean;
  brandName: string;
  tagline: string | null;
  logoUrl: string | null;
  welcomeMessage: string | null;
  theme: ResolvedDocumentTheme;
}
