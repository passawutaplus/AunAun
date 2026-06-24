import { createStart, createMiddleware } from "@tanstack/react-start";
import { setResponseHeader, getRequest } from "@tanstack/react-start/server";

/**
 * Security Headers Middleware
 *
 * Applies hardened HTTP security headers to every SSR / server route response.
 * Uses setResponseHeader() from @tanstack/react-start/server, which is the
 * supported way to mutate the outgoing Response (mutating result.response.headers
 * does NOT work for streamed SSR responses).
 *
 * CSP whitelist: self + Google Fonts + GA + Supabase (+ optional VPS extra origins).
 */

// CSP allowlist
const SUPABASE_HOST = "https://*.supabase.co";
const SUPABASE_WS = "wss://*.supabase.co";
const EXTRA_CONNECT = process.env.CSP_CONNECT_SRC_EXTRA ?? "";
const EXTRA_FRAME_ANCESTORS = process.env.CSP_FRAME_ANCESTORS_EXTRA ?? "";
const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";
const GA_HOSTS =
  "https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com";

const CSP_DIRECTIVES = [
  `default-src 'self'`,
  // 'unsafe-inline'/'unsafe-eval' are required for TanStack hydration scripts.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${GA_HOSTS}`,
  `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS_CSS}`,
  `font-src 'self' data: ${GOOGLE_FONTS_FILES}`,
  `img-src 'self' data: blob: https:`,
  `connect-src 'self' ${SUPABASE_HOST} ${SUPABASE_WS} ${EXTRA_CONNECT} ${GA_HOSTS} https://accounts.google.com`
    .replace(/\s+/g, " ")
    .trim(),
  `media-src 'self' blob: ${SUPABASE_HOST}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'self' ${EXTRA_FRAME_ANCESTORS}`.replace(/\s+/g, " ").trim(),
  `frame-src 'self' https://www.youtube.com https://player.vimeo.com https://accounts.google.com`,
  `report-uri /api/public/csp-report`,
  `upgrade-insecure-requests`,
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP_DIRECTIVES,
  "X-Content-Type-Options": "nosniff",
  // X-Frame-Options removed — cannot express an allowlist; CSP `frame-ancestors` controls embedding.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "same-site",
  "X-DNS-Prefetch-Control": "on",
};

// Long-cache static asset extensions. Vite emits hashed filenames so
// `immutable` is safe — content changes get a new URL.
const LONG_CACHE_EXT_RE =
  /\.(?:js|mjs|css|woff2?|ttf|otf|eot|webp|avif|png|jpe?g|gif|svg|ico|map)$/i;

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  // Set headers BEFORE the response stream starts. setResponseHeader is
  // safe to call early — it queues headers onto the in-flight response.
  try {
    const req = getRequest();
    const url = req ? new URL(req.url) : null;
    const pathname = url?.pathname ?? "";
    const isApi = pathname.startsWith("/api/");
    const isLovable = pathname.startsWith("/lovable/");
    const isAsset =
      pathname.startsWith("/assets/") ||
      pathname.startsWith("/_build/") ||
      LONG_CACHE_EXT_RE.test(pathname);

    // Safety net: skip all custom security headers on Lovable-internal paths
    // so the editor/preview iframe + tooling are never blocked by our CSP.
    if (isLovable) {
      return next();
    }

    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      // Skip CSP on /api/ to avoid breaking JSON/XML consumers
      if (isApi && key === "Content-Security-Policy") continue;
      setResponseHeader(key as any, value);
    }

    // Efficient cache lifetimes (PageSpeed: "Use efficient cache lifetimes").
    // Hashed static assets → 1 year immutable. SEO files → 1 hour.
    // HTML routes → must-revalidate so users always get fresh markup.
    if (isAsset) {
      setResponseHeader("Cache-Control" as any, "public, max-age=31536000, immutable");
    } else if (pathname === "/sitemap.xml" || pathname === "/robots.txt") {
      setResponseHeader("Cache-Control" as any, "public, max-age=3600");
    } else if (!isApi) {
      setResponseHeader("Cache-Control" as any, "public, max-age=0, must-revalidate");
    }
  } catch {
    // never let header injection break the response
  }

  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware],
}));
