/**
 * Credit + licence hints from a page (phase 11.C). Pure: the content script passes in what it read from the DOM.
 * Result is DATA ("source and credit saved"), never a statement that a licence was granted.
 *   input: { links:[{rel,href}], metas:{ "author": "...", "og:site_name": "..." }, jsonLd:[stringified JSON], pageUrl, imageUrl }
 */
const names = v => (Array.isArray(v) ? v : v ? [v] : []).map(x => (typeof x === "string" ? x : x?.name)).filter(Boolean).map(s => String(s).trim()).filter(Boolean);

function walk(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach(n => walk(n, out));
  if (node.license) out.license = out.license || (typeof node.license === "string" ? node.license : node.license?.url || node.license?.["@id"]);
  for (const key of ["creator", "author"]) names(node[key]).forEach(n => out.creators.add(n));
  if (node.copyrightHolder) names(node.copyrightHolder).forEach(n => (out.holder ||= n));
  if (node["@graph"]) walk(node["@graph"], out);
}

export function extractCredit({ links = [], metas = {}, jsonLd = [], pageUrl = "", imageUrl = "" } = {}) {
  const out = { license: "", creators: new Set(), holder: "" };
  for (const text of jsonLd) {
    try { walk(JSON.parse(text), out); } catch { /* malformed block */ }
  }
  const relLicense = links.find(l => /\blicense\b/i.test(l.rel || ""))?.href;
  const metaAuthor = metas.author || metas["article:author"] || metas["twitter:creator"];
  if (metaAuthor) String(metaAuthor).split(/[,&]/).map(s => s.trim()).filter(Boolean).slice(0, 3).forEach(n => out.creators.add(n.replace(/^@/, "")));
  const licenseUrl = String(out.license || relLicense || "");
  return {
    creators: [...out.creators].slice(0, 4),
    siteName: String(metas["og:site_name"] || "").trim(),
    licenseUrl: /^https?:\/\//i.test(licenseUrl) ? licenseUrl : "",
    licenseText: licenseUrl && !/^https?:\/\//i.test(licenseUrl) ? licenseUrl.slice(0, 160) : "",
    copyrightHolder: out.holder,
    pageUrl,
    imageUrl,
  };
}
