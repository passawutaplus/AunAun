/**
 * Bot-friendly HTML shell with correct meta for public deep links.
 * Used by middleware when User-Agent looks like a crawler / social preview bot.
 *
 * GET /api/seo-preview?path=/project/...|/jobs/...|/@user|/u/...|/
 */
const BOT_CACHE_SECONDS = 300;

function siteBase(req) {
  const env = process.env.VITE_SITE_URL || process.env.SITE_URL || "";
  if (env) return env.replace(/\/$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host || "aplus1.app";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`.replace(/\/$/, "");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell({ title, description, url, image, noindex, jsonLd }) {
  const robots = noindex ? "noindex, nofollow" : "index, follow";
  const ld = jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="${robots}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="th_TH" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  ${ld}
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <p><a href="${escapeHtml(url)}">เปิดใน Aplus1</a></p>
  </main>
</body>
</html>`;
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function resolveMeta(pathname, base) {
  const defaultMeta = {
    title: "Aplus1 — 1 โปรไฟล์ สู่ 100+ โอกาส",
    description:
      "Aplus1 ช่วยค้นหาครีเอเตอร์จากผลงานจริง — ดูสไตล์และบริบทงานก่อนคุยโอกาส ไม่ใช่แพ็กเกจราคา",
    url: `${base}${pathname === "/" ? "/" : pathname}`,
    image: `${base}/icons/icon-512.png`,
    noindex: false,
    jsonLd: null,
  };

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const anonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) return defaultMeta;

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: "application/json",
  };
  const anthemHeaders = {
    ...headers,
    "Accept-Profile": "anthem",
    "Content-Profile": "anthem",
  };
  const rest = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;

  const projectMatch = pathname.match(/^\/project\/([0-9a-f-]{36})$/i);
  if (projectMatch) {
    const id = projectMatch[1];
    const rows = await fetchJson(
      `${rest}/projects?select=id,title,description,cover_url,status,owner_id&id=eq.${id}&status=eq.Published&limit=1`,
      anthemHeaders,
    );
    const p = rows?.[0];
    if (!p) return { ...defaultMeta, noindex: true, title: "ไม่พบผลงาน | Aplus1" };
    return {
      title: `${p.title} | Aplus1`,
      description: (p.description || p.title || "").slice(0, 160),
      url: `${base}/project/${p.id}`,
      image: p.cover_url || defaultMeta.image,
      noindex: false,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: p.title,
        url: `${base}/project/${p.id}`,
      },
    };
  }

  const jobMatch = pathname.match(/^\/jobs\/([0-9a-f-]{36})$/i);
  if (jobMatch) {
    const id = jobMatch[1];
    const rows = await fetchJson(
      `${rest}/job_posts?select=id,title,description,status,cover_image_url,created_at,deadline&id=eq.${id}&limit=1`,
      anthemHeaders,
    );
    const j = rows?.[0];
    if (!j) return { ...defaultMeta, noindex: true, title: "ไม่พบงาน | Aplus1" };
    const open = j.status === "open";
    return {
      title: `${j.title} | Aplus1`,
      description: (j.description || j.title || "").slice(0, 160),
      url: `${base}/jobs/${j.id}`,
      image: j.cover_image_url || defaultMeta.image,
      noindex: !open,
      jsonLd: open
        ? {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: j.title,
            datePosted: j.created_at,
            validThrough: j.deadline || undefined,
            url: `${base}/jobs/${j.id}`,
          }
        : null,
    };
  }

  const vanityMatch = pathname.match(/^\/@([a-z0-9_.]{2,})$/i);
  const uuidMatch = pathname.match(/^\/u\/([0-9a-f-]{36})$/i);
  if (vanityMatch || uuidMatch) {
    const q = vanityMatch
      ? `username=eq.${encodeURIComponent(vanityMatch[1])}`
      : `user_id=eq.${uuidMatch[1]}`;
    const rows = await fetchJson(
      `${rest}/profiles_public?select=user_id,username,display_name,bio,avatar_url&${q}&limit=1`,
      headers,
    );
    const profile = rows?.[0];
    if (!profile) return { ...defaultMeta, noindex: true, title: "ไม่พบโปรไฟล์ | Aplus1" };
    const name = profile.display_name || profile.username || "ครีเอเตอร์";
    const path = profile.username ? `/@${profile.username}` : `/u/${profile.user_id}`;
    const thin = !(profile.bio && profile.bio.trim().length >= 40);
    return {
      title: `${name} | Aplus1`,
      description: (profile.bio || `ดูพอร์ตโฟลิโอของ ${name} บน Aplus1`).slice(0, 160),
      url: `${base}${path}`,
      image: profile.avatar_url || defaultMeta.image,
      noindex: thin,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Person",
        name,
        url: `${base}${path}`,
      },
    };
  }

  if (pathname.startsWith("/explore/")) {
    return {
      ...defaultMeta,
      title: `สำรวจผลงาน | Aplus1`,
      description: "สำรวจผลงานตามเครื่องมือและแท็กบน Aplus1",
      url: `${base}${pathname}`,
    };
  }

  return defaultMeta;
}

export default async function handler(req, res) {
  try {
    const raw = typeof req.query.path === "string" ? req.query.path : "/";
    let pathname = "/";
    try {
      pathname = raw.startsWith("http") ? new URL(raw).pathname : raw.split("?")[0];
    } catch {
      pathname = "/";
    }
    if (!pathname.startsWith("/")) pathname = `/${pathname}`;

    const base = siteBase(req);
    const meta = await resolveMeta(pathname, base);
    const html = shell(meta);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", `public, s-maxage=${BOT_CACHE_SECONDS}, stale-while-revalidate=600`);
    res.status(200).send(html);
  } catch (err) {
    console.error("seo-preview error", err);
    res.status(500).send("SEO preview error");
  }
}
