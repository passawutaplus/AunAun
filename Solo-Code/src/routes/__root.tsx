import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import * as React from "react";
import { HttpErrorPage } from "@/components/HttpErrorPage";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthProvider";
import { CookieConsent } from "@/components/CookieConsent";
import { DraggableFabDock } from "@/components/DraggableFabDock";
import { AssistantProvider } from "@/context/AssistantContext";
import { AssistantSidebar } from "@/components/assistant/AssistantSidebar";
import { AssistantPushLayout } from "@/components/assistant/AssistantPushLayout";
import { ProductTourProvider } from "@/components/dashboard/ProductTourProvider";
import type { RouterAppContext } from "@/router";
// Side-effect import: patches window.fetch to attach Supabase bearer token
// to TanStack server-function requests so `requireSupabaseAuth` middleware works.
import "@/integrations/supabase/server-fn-fetch";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { installCspReporter } from "@/lib/cspReporter";
import { initErrorMonitoring } from "@/lib/errorMonitoring";
import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/siteUrl";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return <HttpErrorPage kind="404" code={404} />;
}

function RootErrorComponent({ error }: { error: Error }) {
  if (typeof window !== "undefined") {
    void import("@/lib/errorMonitoring").then(({ captureException }) => captureException(error));
  }
  return (
    <HttpErrorPage kind="500" code={500} errorMessage={error?.message} showRetry showSupport />
  );
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: `${SITE_NAME} — หลังบ้านครบวงจรสำหรับฟรีแลนซ์` },
      {
        name: "description",
        content:
          "หลังบ้านครบวงจรสำหรับฟรีแลนซ์ไทย — ลูกค้า ใบเสนอราคา การเงิน ภาษี Smart Brief และ Creative Labs",
      },
      { name: "author", content: SITE_NAME },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "th_TH" },
      { property: "og:image", content: DEFAULT_OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
      { name: "google-site-verification", content: "48ogbmyN8trqi-SFjJjYN-mQ5eGjM9f54QDZwZljT5U" },
      // PWA / cross-platform native-app meta
      { name: "theme-color", content: "#FFFFFF", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0F0F0F", media: "(prefers-color-scheme: dark)" },
      { name: "color-scheme", content: "light dark" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "So1o" },
      { name: "application-name", content: "So1o" },
      { name: "format-detection", content: "telephone=no" },
      { name: "msapplication-TileColor", content: "#E8740C" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: SITE_NAME,
              url: `${SITE_URL}/`,
              logo: DEFAULT_OG_IMAGE,
            },
            {
              "@type": "WebSite",
              name: SITE_NAME,
              url: `${SITE_URL}/`,
              inLanguage: "th-TH",
            },
          ],
        }),
      },
    ],
    links: [
      // Preconnect to Google Fonts CDNs to cut DNS+TLS handshake latency
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Non-render-blocking font load: load as print, then swap to all on load.
      // This avoids FCP being blocked by the font CSS download.
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap",
      } as any,
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap",
        media: "print",
        onLoad: "this.media='all'",
      } as any,
      // Fallback: if JS is disabled the print->all swap won't fire, so load synchronously
      // (still fine because most users have JS).
      { rel: "stylesheet", href: appCss },
      // PWA manifest + Apple touch icon (installable on iOS/Android/macOS/Windows)
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  React.useEffect(() => {
    installCspReporter();
    void initErrorMonitoring();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProductTourProvider>
          <AssistantProvider>
            <AssistantPushLayout>
              <DemoModeBanner />
              <Outlet />
              <CookieConsent />
            </AssistantPushLayout>
            <DraggableFabDock />
            <AssistantSidebar />
          </AssistantProvider>
        </ProductTourProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
