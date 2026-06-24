import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/siteUrl";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /dashboard",
          "Disallow: /admin",
          "Disallow: /apply",
          "Disallow: /labs",
          "Disallow: /survey",
          "Disallow: /api/",
          "",
          `Sitemap: ${SITE_URL}/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
