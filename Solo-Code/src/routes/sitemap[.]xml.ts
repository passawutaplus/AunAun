import { createFileRoute } from "@tanstack/react-router";
import { listArticleSitemap } from "@/server/articles.functions";
import { SITE_URL } from "@/lib/siteUrl";
import { PUBLIC_ROUTES, xmlEscape } from "@/lib/sitemap";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().slice(0, 10);

        const staticUrls = PUBLIC_ROUTES.map((r) => {
          const loc = r.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${r.path}`;
          return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`;
        });

        let articleUrls: string[] = [];
        try {
          const { articles } = await listArticleSitemap();
          articleUrls = (
            articles as Array<{
              slug: string;
              published_at?: string | null;
              updated_at?: string | null;
            }>
          ).map((a) => {
            const lastmod = (a.updated_at || a.published_at || today).slice(0, 10);
            return `  <url>\n    <loc>${SITE_URL}/blog/${xmlEscape(a.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
          });
        } catch {
          // articles fetch failure should not break the sitemap
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...articleUrls].join("\n")}\n</urlset>\n`;
        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
