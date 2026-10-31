/**
 * Edge middleware — serve server-rendered meta HTML to known crawlers / social bots.
 * Humans still get the Vite SPA. Uses rewrite (not redirect) so indexed URLs stay clean.
 */
export const config = {
  matcher: [
    "/",
    "/project/:path*",
    "/jobs/:path*",
    "/u/:path*",
    "/explore/:path*",
    "/s/:path*",
    "/series/:path*",
    "/legal/:path*",
    "/((?!assets|api|icons|images|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap|llms\\.txt).*)",
  ],
};

// AI search / answer bots (OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot) don't run
// JavaScript either — without this they'd see an empty SPA shell instead of the work.
const BOT_UA =
  /googlebot|google-inspectiontool|bingbot|yandex|baiduspider|twitterbot|facebookexternalhit|meta-externalfetcher|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|applebot|duckduckbot|semrushbot|ahrefsbot|bytespider|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-user|claude-searchbot|perplexity|pinterest|redditbot|kakaotalk|embedly|iframely|mastodon|skypeuripreview|line\/|micromessenger|instagram/i;

export default async function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  if (!BOT_UA.test(ua)) return;

  const { pathname } = new URL(request.url);
  if (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/api/") ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/sitemap") ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return;
  }

  const preview = new URL("/api/seo-preview", request.url);
  preview.searchParams.set("path", pathname);
  return fetch(preview, {
    headers: {
      Accept: "text/html",
      "x-seo-preview": "1",
    },
  });
}
