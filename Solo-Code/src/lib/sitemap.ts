import { HELP_GUIDE_SEO } from "@/lib/helpSeo";

const BASE_PUBLIC_ROUTES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", changefreq: "daily", priority: "0.8" },
  { path: "/help", changefreq: "monthly", priority: "0.85" },
  { path: "/pricing", changefreq: "monthly", priority: "0.9" },
  { path: "/creative-partner", changefreq: "monthly", priority: "0.7" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/refund", changefreq: "yearly", priority: "0.3" },
];

const HELP_GUIDE_ROUTES = Object.keys(HELP_GUIDE_SEO).map((path) => ({
  path,
  changefreq: "monthly",
  priority: "0.8",
}));

/** Only indexable public pages — exclude noindex / auth / app routes. */
export const PUBLIC_ROUTES = [...BASE_PUBLIC_ROUTES, ...HELP_GUIDE_ROUTES];

/** Routes that must never appear in the public sitemap. */
export const SITEMAP_EXCLUDED_PATHS = [
  "/dashboard",
  "/admin",
  "/auth",
  "/apply",
  "/labs",
  "/survey",
] as const;

export function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}
