/** Pure helpers for sitemap generation — shared by CLI and unit tests. */

/**
 * Public static routes that are indexable under launch-minimal.
 * Do not list launch-hidden paths (/jobs, /advertise, /community, /s/*, …).
 */
export const FORUM_CATEGORY_SLUGS = ["announcements", "help", "bug", "idea", "feedback"];

export const STATIC_PATHS = [
  { loc: "/", priority: "1.0", changefreq: "daily", group: "static" },
  { loc: "/forum", priority: "0.85", changefreq: "daily", group: "static" },
  ...FORUM_CATEGORY_SLUGS.map((slug) => ({
    loc: `/forum/c/${slug}`,
    priority: "0.7",
    changefreq: "daily",
    group: "static",
  })),
  { loc: "/legal/privacy", priority: "0.3", changefreq: "monthly", group: "static" },
  { loc: "/legal/terms", priority: "0.3", changefreq: "monthly", group: "static" },
  { loc: "/legal/payment-refund", priority: "0.35", changefreq: "monthly", group: "static" },
  { loc: "/legal/service-agreement", priority: "0.35", changefreq: "monthly", group: "static" },
  { loc: "/legal/cookies", priority: "0.2", changefreq: "monthly", group: "static" },
  { loc: "/legal/rights", priority: "0.2", changefreq: "monthly", group: "static" },
  { loc: "/legal/ip", priority: "0.3", changefreq: "monthly", group: "static" },
  { loc: "/legal/community", priority: "0.4", changefreq: "monthly", group: "static" },
  { loc: "/legal/copyright-report", priority: "0.2", changefreq: "monthly", group: "static" },
];

/** Seed studio slugs — only included when full-product sitemap mode is on. */
export const STUDIO_SLUGS = [
  "doi-studio",
  "lotus-lab",
  "mango-pixel",
  "inkwell-co",
  "frame-field",
  "sundaze-crafts",
  "soundwave-bkk",
  "pixel-garden",
  "yim-studio",
  "talay-creative",
];

/** Routes that must never appear in the public sitemap. */
export const EXCLUDED_PATHS = [
  "/admin",
  "/auth",
  "/chat",
  "/settings",
  "/notifications",
  "/portfolio/manage",
  "/portfolio/saved",
  "/dashboard",
  "/earnings",
  "/verify",
  "/referrals",
  "/contracts",
  "/inspire",
  "/collections",
  "/api",
  "/reset-password",
  "/forum/admin",
  "/forum/new",
  "/forum/search",
  "/forum/me",
];

/** Catalog project IDs present in seed (0x00–0x45). */
export const CATALOG_PROJECT_COUNT = 70;
/** Catalog profile IDs present in seed (a000–a01f). */
export const CATALOG_PROFILE_COUNT = 32;

export function catalogUid(i) {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0000-00000000a0${hex}`;
}

export function catalogProjectId(i) {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0002-0000000000${hex}`;
}

/**
 * @param {{
 *   fullProduct?: boolean,
 *   projectIds?: string[],
 *   profileUserIds?: string[],
 *   vanityHandles?: string[],
 *   seriesIds?: string[],
 *   jobIds?: string[],
 *   explorePaths?: string[],
 *   images?: { loc: string, imageLoc: string, title?: string }[],
 * }} [opts]
 */
export function buildSitemapUrls(opts = {}) {
  const fullProduct = opts.fullProduct === true;
  const projectIds =
    opts.projectIds?.length > 0
      ? opts.projectIds
      : Array.from({ length: CATALOG_PROJECT_COUNT }, (_, i) => catalogProjectId(i));
  const profileUserIds =
    opts.profileUserIds?.length > 0
      ? opts.profileUserIds
      : Array.from({ length: CATALOG_PROFILE_COUNT }, (_, i) => catalogUid(i));
  const vanityHandles = (opts.vanityHandles || []).filter(Boolean);
  const seriesIds = opts.seriesIds || [];
  const jobIds = opts.jobIds || [];
  const explorePaths = opts.explorePaths || [];

  const staticPaths = STATIC_PATHS.map((p) => ({ ...p }));
  if (fullProduct) {
    staticPaths.splice(
      1,
      0,
      { loc: "/jobs", priority: "0.9", changefreq: "daily", group: "static" },
      { loc: "/advertise", priority: "0.7", changefreq: "weekly", group: "static" },
      { loc: "/community", priority: "0.8", changefreq: "daily", group: "static" },
      { loc: "/research", priority: "0.5", changefreq: "weekly", group: "static" },
    );
  }

  const urls = [
    ...staticPaths,
    ...projectIds.map((id) => ({
      loc: `/project/${id}`,
      priority: "0.8",
      changefreq: "weekly",
      group: "projects",
    })),
    ...profileUserIds.map((id) => ({
      loc: `/u/${id}`,
      priority: "0.7",
      changefreq: "weekly",
      group: "profiles",
    })),
    ...vanityHandles.map((handle) => ({
      loc: `/@${String(handle).replace(/^@/, "")}`,
      priority: "0.75",
      changefreq: "weekly",
      group: "profiles",
    })),
    ...seriesIds.map((id) => ({
      loc: `/series/${id}`,
      priority: "0.65",
      changefreq: "weekly",
      group: "series",
    })),
    ...explorePaths.map((loc) => ({
      loc,
      priority: "0.6",
      changefreq: "weekly",
      group: "explore",
    })),
    ...jobIds.map((id) => ({
      loc: `/jobs/${id}`,
      priority: "0.7",
      changefreq: "daily",
      group: "jobs",
    })),
  ];

  if (fullProduct) {
    urls.push(
      ...STUDIO_SLUGS.map((slug) => ({
        loc: `/s/${slug}`,
        priority: "0.6",
        changefreq: "weekly",
        group: "studios",
      })),
    );
  }

  return urls.filter((u) => !EXCLUDED_PATHS.some((ex) => u.loc === ex || u.loc.startsWith(`${ex}/`)));
}

function urlsetXml(normalizedBase, urls, { images = [] } = {}) {
  const imageByLoc = new Map(images.map((img) => [img.loc, img]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/generate-sitemap.mjs — run: npm run sitemap:gen -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map((u) => {
    const img = imageByLoc.get(u.loc);
    const imageBlock = img
      ? `
    <image:image>
      <image:loc>${escapeXml(img.imageLoc)}</image:loc>
      ${img.title ? `<image:title>${escapeXml(img.title)}</image:title>` : ""}
    </image:image>`
      : "";
    return `  <url>
    <loc>${normalizedBase}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${imageBlock}
  </url>`;
  })
  .join("\n")}
</urlset>
`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSitemapXml(base, opts = {}) {
  const normalizedBase = base.replace(/\/$/, "");
  const urls = buildSitemapUrls(opts);
  return urlsetXml(normalizedBase, urls, { images: opts.images || [] });
}

/** Split urls into type-specific sitemaps + index. */
export function buildSitemapBundles(base, opts = {}) {
  const normalizedBase = base.replace(/\/$/, "");
  const urls = buildSitemapUrls(opts);
  const groups = {
    static: urls.filter((u) => u.group === "static"),
    projects: urls.filter((u) => u.group === "projects"),
    profiles: urls.filter((u) => u.group === "profiles"),
    series: urls.filter((u) => u.group === "series"),
    explore: urls.filter((u) => u.group === "explore"),
    jobs: urls.filter((u) => u.group === "jobs"),
    studios: urls.filter((u) => u.group === "studios"),
  };

  const files = {};
  const indexEntries = [];

  for (const [name, list] of Object.entries(groups)) {
    if (list.length === 0) continue;
    const filename = `sitemap-${name}.xml`;
    files[filename] = urlsetXml(normalizedBase, list, {
      images: (opts.images || []).filter((img) => list.some((u) => u.loc === img.loc)),
    });
    indexEntries.push(filename);
  }

  // Combined sitemap for backward compatibility
  files["sitemap.xml"] = urlsetXml(normalizedBase, urls, { images: opts.images || [] });

  files["sitemap-index.xml"] = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/generate-sitemap.mjs -->
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries
  .map(
    (f) => `  <sitemap>
    <loc>${normalizedBase}/${f}</loc>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>
`;

  return { files, urlCount: urls.length, indexEntries };
}
